// pages/Chat/ChatRoomPage.tsx
// (변경점)
// - pickOtherNickname() 유틸로 상대 닉네임 계산 통일
// - 내 아이덴티티 로드 완료 후(upsert 시점 보정) 방 요약 생성/갱신
// - headerTitle 변경 시 chatStore.nickname 동기화 (updateRoomOnSendSmart에 nickname 전달)
// - buyer/seller 닉네임 소스 확장(writerNickname 등)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import styles from './ChatRoomPage.styles';

import AttachmentBar from '@/components/Chat/AttachmentBar/AttachmentBar';
import ChatHeader from '@/components/Chat/ChatHeader/ChatHeader';
import LostCloseButton from '@/components/Chat/LostCloseButton/LostCloseButton';
import MessageList from '@/components/Chat/MessageList/MessageList';
import MoreMenu from '@/components/Chat/MoreMenu/MoreMenu';
import SaleStatusSelector, { type SaleStatusLabel } from '@/components/Chat/SaleStatusSelector/SaleStatusSelector';
import AppointmentModal from '@/components/Modal/AppointmentModal';

import useChatRoom from '@/hooks/useChatRoom';
import useLostClose from '@/hooks/useLostClose';
import usePermissions from '@/hooks/usePermissions';

import { blockUser, isBlockedUser, type BlockedUser } from '@/utils/blocked';
import { deriveRoomIdFromParams } from '@/utils/chatId';
import { getLocalIdentity } from '@/utils/localIdentity';

import marketTradeRepo from '@/repositories/trades/MarketTradeRepo';
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

import { updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';

const calendarIcon = require('../../assets/images/calendar.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

type ApiSaleStatus = 'ON_SALE' | 'RESERVED' | 'SOLD';
const toLabel = (s?: ApiSaleStatus): SaleStatusLabel => {
  switch (s) {
    case 'RESERVED': return '예약중';
    case 'SOLD':     return '거래완료';
    case 'ON_SALE':
    default:         return '판매중';
  }
};
const toApi = (l: SaleStatusLabel): ApiSaleStatus => {
  switch (l) {
    case '예약중':   return 'RESERVED';
    case '거래완료': return 'SOLD';
    case '판매중':
    default:         return 'ON_SALE';
  }
};

// ---------- 유틸: 상대 닉네임 결정 ----------
function pickOtherNickname(opts: {
  meEmail?: string | null;
  meId?: string | null;
  isOwner: boolean;
  sellerEmail?: string;
  buyerEmail?: string;
  sellerId?: string | number;
  buyerId?: string | number;
  sellerName?: string;
  buyerName?: string;
  opponentNickname?: string;
}) {
  const toL = (v?: string | null) => (v ?? '').trim().toLowerCase();
  const toS = (v?: string | number) => (v == null ? '' : String(v));
  const {
    meEmail, meId, isOwner,
    sellerEmail, buyerEmail, sellerId, buyerId,
    sellerName, buyerName, opponentNickname,
  } = opts;

  const amSeller =
    isOwner ||
    (!!meEmail && !!sellerEmail && toL(meEmail) === toL(sellerEmail)) ||
    (!!meId && !!sellerId && toS(meId) === toS(sellerId));
  const amBuyer =
    (!!meEmail && !!buyerEmail && toL(meEmail) === toL(buyerEmail)) ||
    (!!meId && !!buyerId && toS(meId) === toS(buyerId));

  if (amSeller) {
    if (buyerName) return buyerName;
    if (opponentNickname && opponentNickname !== sellerName) return opponentNickname;
    return '상대방';
  }
  if (amBuyer) {
    if (sellerName) return sellerName;
    if (opponentNickname && opponentNickname !== buyerName) return opponentNickname;
    return '상대방';
  }
  if (sellerName && sellerName !== buyerName) return sellerName;
  return buyerName || opponentNickname || '상대방';
}

function toMs(t: unknown): number {
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Number(new Date(t));
  if (t instanceof Date) return Number(t);
  return Date.now();
}
function buildPreviewFromMessage(m: any): string {
  switch (m?.type) {
    case 'text': return (m?.text ?? '').toString();
    case 'image':
      if (typeof m?.count === 'number' && m.count > 1) return `📷 사진 ${m.count}장`;
      if (Array.isArray(m?.imageUris) && m.imageUris.length > 1) return `📷 사진 ${m.imageUris.length}장`;
      return '📷 사진';
    case 'appointment': return '📅 약속 제안';
    case 'system': return (m?.text ?? '시스템 알림').toString();
    default: return (m?.text ?? String(m?.type ?? '')).toString();
  }
}
const toLower = (s?: unknown) => (s == null ? '' : String(s)).trim().toLowerCase();
const toStr   = (v?: unknown) => (v == null ? '' : String(v));

export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const raw = (route.params ?? {}) as any;

  const [open, setOpen] = useState(false);

  const isLost = raw?.source === 'lost';
  const isMarket = raw?.source === 'market';
  const isGroupBuy = raw?.source === 'groupbuy';

  const cardTitle: string = isMarket ? (raw?.productTitle ?? '게시글 제목') : (raw?.postTitle ?? '게시글 제목');
  const cardImageUri: string | undefined = isMarket ? raw?.productImageUri : raw?.postImageUri;

  const priceLabel = useMemo(() => {
    if (!isMarket) return '';
    const price = raw?.productPrice;
    if (typeof price === 'number' && price > 0) return `₩ ${price.toLocaleString('ko-KR')}`;
    if (price === 0) return '나눔';
    return '';
  }, [isMarket, raw?.productPrice]);

  const placeLabel: string = isLost ? raw?.place ?? '장소 정보 없음' : '';
  const purposeBadge: string = isLost ? (raw?.purpose === 'lost' ? '분실' : '습득') : '';
  const recruitLabel: string = isGroupBuy ? raw?.recruitLabel ?? '' : '';

  const proposedId = raw?.roomId ?? deriveRoomIdFromParams(raw);
  const [roomId] = useState<string | null>(proposedId ?? null);
  const initialMessage: string | undefined = raw?.initialMessage;

  const { isOwner } = usePermissions({
    authorId: raw?.authorId,
    authorEmail: raw?.authorEmail,
    routeParams: { isOwner: raw?.isOwner },
  });
  const [devForceOwner, setDevForceOwner] = useState<boolean | null>(null);
  const effectiveIsOwner = (__DEV__ && devForceOwner !== null) ? devForceOwner : isOwner;

  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { userEmail, userId } = await getLocalIdentity();
        setMyEmail(userEmail ?? null);
        setMyId(userId ?? null);
      } catch {
        setMyEmail(null);
        setMyId(null);
      }
    })();
  }, []);
  const identityReady = (myEmail !== null || myId !== null); // ✅ 아이덴티티 로드 시점 플래그

  // 상대/내 식별 값
  const sellerEmail = raw?.sellerEmail ?? raw?.authorEmail ?? undefined;
  const buyerEmail  = raw?.buyerEmail  ?? raw?.opponentEmail ?? raw?.userEmail ?? undefined;
  const sellerId = raw?.sellerId ?? raw?.authorId ?? undefined;
  const buyerId  = raw?.buyerId  ?? raw?.opponentId ?? raw?.userId ?? undefined;

  // 닉네임 소스 확장
  const sellerName =
    raw?.sellerNickname ??
    raw?.posterNickname ??
    raw?.authorNickname ??
    raw?.writerNickname ??   // ⬅️ 추가
    raw?.nickname ??         // 레거시
    '';
  const buyerName =
    raw?.buyerNickname ??
    raw?.userNickname ??
    raw?.opponentBuyerNickname ?? // ⬅️ 추가 (혹시 존재 시)
    '';

  // ✅ 헤더 타이틀: 항상 "상대 닉네임"
  const headerTitle: string = useMemo(() => {
    return pickOtherNickname({
      meEmail: myEmail,
      meId: myId,
      isOwner: effectiveIsOwner,
      sellerEmail, buyerEmail,
      sellerId, buyerId,
      sellerName, buyerName,
      opponentNickname: raw?.opponentNickname,
    });
  }, [myEmail, myId, effectiveIsOwner, sellerEmail, buyerEmail, sellerId, buyerId, sellerName, buyerName, raw?.opponentNickname]);

  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(
    toLabel(raw?.initialSaleStatus as ApiSaleStatus | undefined)
  );

  const {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment
  } = useChatRoom(roomId ?? '');

  const { lostStatus, handleCloseLost } = useLostClose({
    roomId: roomId ?? '',
    initial: (raw?.initialLostStatus as 'OPEN' | 'RESOLVED') ?? 'OPEN',
    pushMessage: (msg) => setMessages(prev => [...prev, msg]),
  });

  const showSaleStatus = isMarket && effectiveIsOwner && !!raw?.postId;
  const showLostClose = isLost && effectiveIsOwner && !!raw?.postId;

  const opponent = useMemo<BlockedUser | null>(() => {
    const idLike =
      raw?.opponentId ?? raw?.sellerId ?? raw?.authorId ?? raw?.userId ??
      raw?.opponentEmail ?? raw?.sellerEmail ?? raw?.authorEmail;
    const nameLike = headerTitle || raw?.opponentNickname || sellerName || buyerName;
    if (!idLike || !nameLike) return null;
    return {
      id: String(idLike),
      name: String(nameLike),
      dept: raw?.opponentDept ?? raw?.department ?? undefined,
      avatarUri: raw?.opponentAvatarUri ?? raw?.avatarUri ?? undefined,
    };
  }, [raw, headerTitle, sellerName, buyerName]);

  const opponentEmail: string | null = useMemo(() => {
    return (raw?.opponentEmail ?? raw?.buyerEmail ?? null) || null;
  }, [raw?.opponentEmail, raw?.buyerEmail]);

  const [isBlocked, setIsBlocked] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        if (!opponent?.id) {
          setIsBlocked(false);
          return;
        }
        const blocked = await isBlockedUser(opponent.id);
        setIsBlocked(blocked);
      } catch (e) {
        console.log('check blocked error', e);
        setIsBlocked(false);
      }
    })();
  }, [opponent?.id]);

  const [menuVisible, setMenuVisible] = useState(false);
  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert('신고하기', '해당 사용자를 신고하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '신고', style: 'destructive', onPress: () => {} },
    ]);
  };
  const handleBlock = () => {
    setMenuVisible(false);
    if (!opponent?.id) {
      Alert.alert('오류', '상대 사용자 정보를 확인할 수 없어요.');
      return;
    }
    Alert.alert(
      '차단하기',
      `${opponent.name} 님을 차단할까요?\n채팅/게시글에서 표시/상호작용이 제한될 수 있어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(opponent);
              navigation.navigate('MyBlockedUsers');
            } catch (e) {
              console.log('blockUser error', e);
              Alert.alert('오류', '차단 중 문제가 발생했어요. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  const handleChangeSaleStatus = async (nextLabel: SaleStatusLabel) => {
    setSaleStatusLabel(nextLabel);
    const apiValue = toApi(nextLabel);
    if (raw?.postId) {
      try {
        const KEY = 'market_posts_v1';
        const rawList = await AsyncStorage.getItem(KEY);
        const list = rawList ? JSON.parse(rawList) : [];
        const updated = Array.isArray(list)
          ? list.map((it: any) => (it?.id === raw.postId ? { ...it, saleStatus: nextLabel } : it))
          : list;
        await AsyncStorage.setItem(KEY, JSON.stringify(updated));
      } catch (e) {
        console.log('updateMarketCacheStatus error', e);
      }
    }
  };

  const recordTradeCompletion = useCallback(async () => {
    try {
      if (!isMarket || !raw?.postId) return;

      const meEmailNorm = (myEmail ?? '').trim().toLowerCase();
      const meIdStr = (myId ?? '').toString();

      let buyerEmailX = (raw?.buyerEmail ?? raw?.opponentEmail ?? null);
      let buyerIdX = buyerEmailX ? null : (opponent?.id ? String(opponent.id) : null);

      const buyerEmailNorm = (buyerEmailX ?? '').trim().toLowerCase();
      if (buyerEmailNorm && meEmailNorm && buyerEmailNorm === meEmailNorm) {
        buyerEmailX = null;
        buyerIdX = buyerIdX ?? (raw?.buyerId ? String(raw.buyerId) : null);
      }
      if (!buyerEmailX && buyerIdX && meIdStr && buyerIdX === meIdStr) {
        buyerIdX = null;
      }

      await marketTradeRepo.upsert({
        postId: String(raw.postId),
        title: cardTitle,
        price: typeof raw?.productPrice === 'number' ? raw.productPrice : Number(raw?.productPrice) || undefined,
        image: cardImageUri,
        sellerEmail: myEmail ?? (raw?.sellerEmail ?? null),
        sellerId: myId ?? (raw?.sellerId ? String(raw.sellerId) : null),
        buyerEmail: buyerEmailX,
        buyerId: buyerIdX,
        postCreatedAt: raw?.postCreatedAt ?? raw?.createdAt ?? undefined,
      });

      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          type: 'system',
          text: '판매자가 거래를 완료로 변경했어요. 구매자 거래내역에 반영됩니다.',
          time: new Date().toISOString(),
        } as any,
      ]);
    } catch (e) {
      console.log('recordTradeCompletion error', e);
      Alert.alert('오류', '거래완료 처리 중 문제가 발생했어요. 다시 시도해주세요.');
    }
  }, [
    isMarket, raw?.postId, raw?.buyerEmail, raw?.opponentEmail, raw?.buyerId,
    opponent?.id, myEmail, myId, cardTitle, cardImageUri, setMessages,
    raw?.productPrice, raw?.postCreatedAt, raw?.createdAt, raw?.sellerEmail, raw?.sellerId
  ]);

  // ✅ 아이덴티티/헤더 준비 후에만 upsert (초기 잘못된 닉네임 저장 방지)
  useEffect(() => {
    if (!roomId) return;
    loadAndSeed();
    if (!identityReady) return;
    if (!headerTitle) return;

    (async () => {
      try {
        await upsertRoomOnOpen({
          roomId,
          category: isMarket ? 'market' : isLost ? 'lost' : 'group',
          nickname: headerTitle, // ✅ 항상 상대 닉네임
          productTitle: isMarket ? raw?.productTitle : undefined,
          productPrice: isMarket ? raw?.productPrice : undefined,
          productImageUri: isMarket ? raw?.productImageUri : undefined,
          preview: initialMessage,
          origin: {
            source: isMarket ? 'market' : isLost ? 'lost' : 'groupbuy',
            params: raw, // (sanitize는 저장소에서 처리)
          },
        });
      } catch (e) {
        console.log('upsertRoomOnOpen error', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, identityReady, headerTitle]);

  // ✅ headerTitle이 뒤늦게 바뀌어도 리스트 닉네임 동기화
  useEffect(() => {
    if (!roomId) return;
    if (!identityReady) return;
    if (!headerTitle) return;

    updateRoomOnSendSmart({
      roomId,
      originParams: raw,
      nickname: headerTitle, // ✅ 닉네임 동기화
    }).catch(() => {});
  }, [roomId, identityReady, headerTitle]);

  const initialKickRef = useRef<string | null>(null);
  useEffect(() => {
    if (!roomId) return;
    const msg = (raw?.initialMessage ?? '').toString().trim();
    if (!msg) return;

    const key = `${roomId}|${msg}`;
    if (initialKickRef.current === key) return;
    initialKickRef.current = key;

    send(msg);
    try { navigation.setParams({ initialMessage: undefined }); } catch {}
  }, [roomId, raw?.initialMessage, send, navigation]);

  const lastSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!roomId || !Array.isArray(messages) || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const key = `${String(last?.id ?? '')}-${String(last?.time ?? '')}`;
    if (!last?.id && !last?.time) return;
    if (lastSyncedRef.current === key) return;
    lastSyncedRef.current = key;

    const preview = buildPreviewFromMessage(last);
    const ts = toMs(last?.time);
    updateRoomOnSendSmart({
      roomId,
      originParams: raw,
      preview,
      lastTs: ts,
      nickname: headerTitle, // ✅ 프리뷰 갱신과 함께 닉네임도 안정적으로 동기화
    }).catch(e => console.log('updateRoomOnSendSmart error', e));
  }, [messages, roomId, raw, headerTitle]);

  if (!roomId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>채팅방을 준비하고 있어요…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatHeader
        title={headerTitle}
        onPressBack={() => navigation.goBack()}
        onPressMore={() => setMenuVisible(true)}
      />
      <View style={styles.productCardShadowWrap}>
        <View style={styles.productCard}>
          <View style={styles.thumbWrap}>
            {cardImageUri ? (
              <Image source={{ uri: cardImageUri }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
          </View>
          <View style={styles.infoWrap}>
            <Text style={styles.title} numberOfLines={1}>{cardTitle}</Text>
            {isMarket && <Text style={styles.price}>{priceLabel || '₩ 0'}</Text>}
            {isLost && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.badgeBase,
                    raw?.purpose === 'lost' ? styles.badgeLost : styles.badgeFound,
                  ]}
                >
                  <Text style={styles.badgeText}>{purposeBadge}</Text>
                </View>
                <Text style={styles.placeText} numberOfLines={1}>{placeLabel}</Text>
              </View>
            )}
            {isGroupBuy && (
              <Text style={styles.groupBuyLabel} numberOfLines={1}>{recruitLabel}</Text>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => setOpen(true)}>
              <Image source={calendarIcon} style={styles.calendarIcon} />
              <Text style={styles.scheduleBtnText}>약속잡기</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsRight}>
            {showSaleStatus && (
              <SaleStatusSelector
                value={saleStatusLabel}
                onChange={handleChangeSaleStatus}
                onCompleteTrade={recordTradeCompletion}
              />
            )}
            {showLostClose && (
              <LostCloseButton
                value={lostStatus}
                onClose={handleCloseLost}
                readOnly={false}
              />
            )}
          </View>
        </View>
      </View>

      <MessageList data={messages} bottomInset={100 + extraBottomPad} />
      <AttachmentBar uris={attachments} onRemoveAt={removeAttachmentAt} />

      {isBlocked ? (
        <View style={{ padding: 25, alignItems: 'center', backgroundColor: '#f9f9f9' }}>
          <Text style={{ color: '#999', fontSize: 14 }}>
            이 사용자는 차단되어 메시지를 보낼 수 없습니다.
          </Text>
        </View>
      ) : (
        <DetailBottomBar
          variant="chat"
          placeholder="메세지를 입력해주세요."
          onPressSend={send}
          onAddImages={addAttachments}
          attachmentsCount={attachments.length}
        />
      )}

      <MoreMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onReport={handleReport}
        onBlock={handleBlock}
      />

      <AppointmentModal
        visible={open}
        partnerNickname={headerTitle}
        onClose={() => setOpen(false)}
        onSubmit={({ date, time, place }) => {
          pushSystemAppointment(date ?? '', time ?? '', place ?? '');
          setOpen(false);
        }}
      />
    </View>
  );
}
