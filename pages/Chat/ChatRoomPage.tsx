// pages/Chat/ChatRoomPage.tsx
// ---------------------------------------------------------
// 채팅방 화면 (중고거래 / 분실물 / 공동구매 공통)
// - 헤더 하단 "게시글 카드"는 ChatHeader가 렌더
// - 여기서는 카드에 필요한 메타를 계산해서 ChatHeader에 전달
// ---------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { resolveRoomIdForOpen, updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';

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

export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const raw = (route.params ?? {}) as any;

  const [open, setOpen] = useState(false);

  // ✅ 방 유형 판별
  const isLost = raw?.source === 'lost';
  const isMarket = raw?.source === 'market';
  const isGroupBuy = raw?.source === 'groupbuy';

  // ✅ 헤더 카드에 내려줄 기본 메타
  const cardTitle: string = isMarket ? (raw?.productTitle ?? '게시글 제목') : (raw?.postTitle ?? '게시글 제목');
  const cardImageUri: string | undefined = isMarket ? raw?.productImageUri : raw?.postImageUri;

  // 🔽 부가 정보 계산 (헤더 카드에서 사용)
  const priceLabel = useMemo(() => {
    if (!isMarket) return '';
    const price = raw?.productPrice;
    if (typeof price === 'number' && price > 0) return `₩ ${price.toLocaleString('ko-KR')}`;
    if (price === 0) return '나눔🩵';
    return '';
  }, [isMarket, raw?.productPrice]);

  const placeLabel: string = isLost ? (raw?.place ?? '장소 정보 없음') : '';
  const purpose: 'lost' | 'found' | undefined =
    isLost ? (raw?.purpose === 'found' ? 'found' : 'lost') : undefined;
  const recruitLabel: string = isGroupBuy ? (raw?.recruitLabel ?? '') : '';

  // 방 아이디 파생(제안값)
  const proposedId = raw?.roomId ?? deriveRoomIdFromParams(raw);
  // 실제 사용할 정규 roomId (동적으로 갱신)
  const [roomId, setRoomId] = useState<string | null>(proposedId ?? null);

  // ✅ 최초 마운트/params 변경 시, 정규 roomId로 정렬 + 필요하면 메시지 이관
  useEffect(() => {
    (async () => {
      if (!proposedId) {
        setRoomId(null);
        return;
      }
      try {
        // 1) 정규 roomId 계산 (이미 같은 스레드가 있으면 그 방의 roomId 반환)
        const canonical = await resolveRoomIdForOpen(raw, proposedId);
        const finalId = canonical ?? proposedId;

        // 2) 만약 제안값과 정규값이 다르면, 제안값 밑에 저장된 메시지를 정규 roomId로 이관
        if (finalId !== proposedId) {
          const K = 'chat_messages_';
          const from = await AsyncStorage.getItem(K + proposedId);
          const to = await AsyncStorage.getItem(K + finalId);
          if (from && !to) {
            await AsyncStorage.setItem(K + finalId, from);
            await AsyncStorage.removeItem(K + proposedId);
          }
        }

        // 3) 화면/훅 모두 정규 roomId로 통일
        setRoomId(finalId);
      } catch {
        // 실패해도 제안값으로 진행
        setRoomId(proposedId);
      }
    })();
    // proposedId 또는 raw가 바뀌었을 때만 재평가
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposedId]);

  const initialMessage: string | undefined = raw?.initialMessage;

  // ✅ 게시자/나 정보 (이하 로직 동일)
  const posterNickname: string = useMemo(() => (
    (raw?.posterNickname ??
      raw?.authorNickname ??
      raw?.writerNickname ??
      raw?.nickname ??
      raw?.origin?.params?.posterNickname ??
      '') + ''
  ), [raw]);
  const [myNickname, setMyNickname] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const nick = await AsyncStorage.getItem('auth_user_nickname');
        setMyNickname(nick);
      } catch {
        setMyNickname(null);
      }
    })();
  }, []);

  const authorEmailAny: string | null =
    raw?.authorEmail ??
    raw?.writerEmail ??
    raw?.posterEmail ??
    raw?.sellerEmail ??
    raw?.postOwnerEmail ??
    raw?.ownerEmail ??
    raw?.lostOwnerEmail ??
    raw?.origin?.params?.authorEmail ??
    raw?.origin?.params?.writerEmail ??
    raw?.origin?.params?.posterEmail ??
    raw?.origin?.params?.sellerEmail ??
    raw?.origin?.params?.postOwnerEmail ??
    raw?.origin?.params?.ownerEmail ??
    raw?.origin?.params?.lostOwnerEmail ??
    null;

  const authorIdAny: string | number | null =
    raw?.authorId ??
    raw?.writerId ??
    raw?.posterId ??
    raw?.sellerId ??
    raw?.postOwnerId ??
    raw?.ownerId ??
    raw?.origin?.params?.authorId ??
    raw?.origin?.params?.writerId ??
    raw?.origin?.params?.posterId ??
    raw?.origin?.params?.sellerId ??
    raw?.origin?.params?.postOwnerId ??
    raw?.origin?.params?.ownerId ??
    null;

  const authorEmailU: string | undefined = authorEmailAny ?? undefined;
  const authorIdU: string | number | undefined =
    (authorIdAny ?? undefined) as string | number | undefined;

  const { isOwner } = usePermissions({
    authorId: authorIdU,
    authorEmail: authorEmailU,
    routeParams: { isOwner: raw?.isOwner },
  });

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
  const identityReady = (myEmail !== null || myId !== null);

  const sellerEmail = raw?.sellerEmail ?? raw?.authorEmail ?? undefined;
  const buyerEmail  = raw?.buyerEmail  ?? raw?.opponentEmail ?? raw?.userEmail ?? undefined;
  const sellerId = raw?.sellerId ?? raw?.authorId ?? undefined;
  const buyerId  = raw?.buyerId  ?? raw?.opponentId ?? raw?.userId ?? undefined;

  const sellerName =
    raw?.sellerNickname ??
    raw?.posterNickname ??
    raw?.authorNickname ??
    raw?.writerNickname ??
    raw?.nickname ??
    '';
  const buyerName =
    raw?.buyerNickname ??
    raw?.userNickname ??
    raw?.opponentBuyerNickname ??
    '';

  const headerTitle: string = useMemo(() => {
    return pickOtherNickname({
      meEmail: myEmail,
      meId: myId,
      isOwner,
      sellerEmail, buyerEmail,
      sellerId, buyerId,
      sellerName, buyerName,
      opponentNickname: raw?.opponentNickname,
    });
  }, [myEmail, myId, isOwner, sellerEmail, buyerEmail, sellerId, buyerId, sellerName, buyerName, raw?.opponentNickname]);

  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(
    toLabel(raw?.initialSaleStatus as ApiSaleStatus | undefined)
  );

  // ✅ initialMessage를 훅에 넘겨서 "비어있을 때 1회 시딩"을 훅이 보장하도록
  const {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment
  } = useChatRoom(roomId ?? '', roomId ? initialMessage : undefined);

  const isLostContext = useMemo(() => {
    const s =
      raw?.source ??
      raw?.category ??
      raw?.origin?.source ??
      raw?.origin?.params?.source;
    const hasLostHints =
      raw?.purpose === 'lost' ||
      raw?.purpose === 'found' ||
      typeof raw?.place === 'string' ||
      typeof raw?.postImageUri === 'string';
    return s === 'lost' || hasLostHints;
  }, [raw]);

  const generalizedPostId: string | null = useMemo(() => {
    return (
      (raw?.postId && String(raw.postId)) ||
      (raw?.id && String(raw.id)) ||
      (raw?.post_id && String(raw.post_id)) ||
      (raw?.origin?.params?.postId && String(raw.origin.params.postId)) ||
      (raw?.origin?.params?.id && String(raw.origin.params.id)) ||
      null
    );
  }, [raw]);

  const isAuthorStrict = useMemo(() => {
    const n = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const me = n(myEmail);
    const author = n(authorEmailAny);
    return !!me && !!author && me === author;
  }, [myEmail, authorEmailAny]);

  const showLostClose = isLostContext && !!generalizedPostId && isAuthorStrict;

  const opponentEmailX: string | null = useMemo(() => {
    return (raw?.opponentEmail ?? raw?.buyerEmail ?? null) || null;
  }, [raw?.opponentEmail, raw?.buyerEmail]);

  const { lostStatus, handleCloseLost } = useLostClose({
    roomId: roomId ?? '',
    initial: (raw?.initialLostStatus as 'OPEN' | 'RESOLVED') ?? 'OPEN',
    pushMessage: (msg) => setMessages(prev => [...prev, msg]),
    postId: generalizedPostId ?? undefined,
    postTitle: cardTitle,
    postImageUri: cardImageUri,
    place: isLost ? (raw?.place ?? undefined) : undefined,
    recipientEmails: [
      authorEmailAny ?? undefined,
      opponentEmailX ?? undefined,
    ].filter(Boolean) as string[],
  });

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

      let buyerEmailY = (raw?.buyerEmail ?? raw?.opponentEmail ?? null);
      let buyerIdY = buyerEmailY ? null : (opponent?.id ? String(opponent.id) : null);

      const buyerEmailNorm = (buyerEmailY ?? '').trim().toLowerCase();
      if (buyerEmailNorm && meEmailNorm && buyerEmailNorm === meEmailNorm) {
        buyerEmailY = null;
        buyerIdY = buyerIdY ?? (raw?.buyerId ? String(raw.buyerId) : null);
      }
      if (!buyerEmailY && buyerIdY && meIdStr && buyerIdY === meIdStr) {
        buyerIdY = null;
      }

      await marketTradeRepo.upsert({
        postId: String(raw.postId),
        title: cardTitle,
        price: typeof raw?.productPrice === 'number' ? raw.productPrice : Number(raw?.productPrice) || undefined,
        image: cardImageUri,
        sellerEmail: myEmail ?? (raw?.sellerEmail ?? null),
        sellerId: myId ?? (raw?.sellerId ? String(raw.sellerId) : null),
        buyerEmail: buyerEmailY,
        buyerId: buyerIdY,
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

  useEffect(() => {
    if (!roomId) return;
    if (!identityReady) return;
    if (!headerTitle) return;

    (async () => {
      try {
        await upsertRoomOnOpen({
          roomId,
          category: isMarket ? 'market' : isLost ? 'lost' : 'group',
          nickname: headerTitle,
          productTitle: isMarket ? raw?.productTitle : undefined,
          productPrice: isMarket ? raw?.productPrice : undefined,
          productImageUri: isMarket ? raw?.productImageUri : undefined,
          preview: initialMessage,
          origin: {
            source: isMarket ? 'market' : isLost ? 'lost' : 'groupbuy',
            params: raw,
          },
        });
      } catch (e) {
        console.log('upsertRoomOnOpen error', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, identityReady, headerTitle]);

  useEffect(() => {
    if (!roomId) return;
    if (!identityReady) return;
    if (!headerTitle) return;

    updateRoomOnSendSmart({
      roomId,
      originParams: raw,
      nickname: headerTitle,
    }).catch(() => {});
  }, [roomId, identityReady, headerTitle]);

  // ====== ✅ 카드 존재여부 검사(헤더로 주입) ======
  const checkPostExistsExternally = useCallback(async (meta: { source: 'market'|'lost'|'group', postId: string }) => {
    // 1) 로컬 캐시에서 먼저 찾기
    const keyBySource: Record<typeof meta.source, string> = {
      market: 'market_posts_v1',
      lost:   'lost_found_posts_v1',
      group:  'groupbuy_posts_v1',
    };
    try {
      const key = keyBySource[meta.source];
      const rawList = await AsyncStorage.getItem(key);
      if (rawList) {
        const list = JSON.parse(rawList);
        if (Array.isArray(list)) {
          const found = list.find((it: any) => String(it?.id ?? it?.postId) === String(meta.postId));
          if (found?.deleted === true) return false;
          if (found) return true;
        }
      }
    } catch {
      // 캐시 조회 실패는 무시하고 다음 단계로
    }
    // 2) TODO: 필요 시 API 조회 (404 → false)
    return true; // 캐시에 없으면 일단 존재한다고 가정(임시)
  }, []);

  // ====== 렌더 ======
  if (!roomId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>채팅방을 준비하고 있어요…</Text>
      </View>
    );
  }

  // 헤더에 전달할 카드 메타 구성
  const headerSource: 'market'|'lost'|'group' = isMarket ? 'market' : isLost ? 'lost' : 'group';
  const headerPostId = (isMarket ? (raw?.postId ? String(raw.postId) : null) : generalizedPostId) ?? null;

  return (
    <View style={styles.container}>
      {/* 헤더: 상대 닉네임 + (헤더 하단) 게시글 카드 */}
      <ChatHeader
        title={headerTitle}
        onPressBack={() => navigation.goBack()}
        onPressMore={() => setMenuVisible(true)}
        post={headerPostId ? {
          source: headerSource,
          postId: headerPostId,
          title: cardTitle,
          thumbnailUri: cardImageUri,

          // 🔽 부가 정보 전달!
          priceLabel,
          purpose,
          placeLabel,
          recruitLabel,
        } : undefined}
        checkPostExistsExternally={checkPostExistsExternally}
      />

      {/* 액션 행 (약속잡기 / 판매상태 / 분실 회수) */}
      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => setOpen(true)}>
            <Image source={calendarIcon} style={styles.calendarIcon} />
            <Text style={styles.scheduleBtnText}>약속잡기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRight}>
          {/* 중고거래: 판매자만 상태 변경 */}
          {isMarket && isOwner && !!raw?.postId && (
            <SaleStatusSelector
              value={saleStatusLabel}
              onChange={handleChangeSaleStatus}
              onCompleteTrade={recordTradeCompletion}
            />
          )}
          {/* 분실물: "게시자" 본인에게만 완료 처리 버튼 노출 */}
          {showLostClose && (
            <LostCloseButton
              value={lostStatus}
              onClose={handleCloseLost}
              readOnly={false}
            />
          )}
        </View>
      </View>

      {/* 메시지 리스트 / 첨부바 */}
      <MessageList data={messages} bottomInset={100 + extraBottomPad} />
      <AttachmentBar uris={attachments} onRemoveAt={removeAttachmentAt} />

      {/* 차단 상태에 따른 입력 영역 */}
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

      {/* 더보기 메뉴 */}
      <MoreMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onReport={handleReport}
        onBlock={handleBlock}
      />

      {/* 약속(일정) 제안 모달 */}
      <AppointmentModal
        visible={open}
        partnerNickname={headerTitle}
        onClose={() => setOpen(false)}
        onSubmit={({ date, time, place }) => {
          // 시스템 타입 메시지로 약속 제안 전달
          pushSystemAppointment(date ?? '', time ?? '', place ?? '');
          setOpen(false);
        }}
      />
    </View>
  );
}
