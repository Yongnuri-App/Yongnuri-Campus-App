// pages/Chat/ChatRoomPage.tsx
// ---------------------------------------------------------
// 채팅방 화면 (중고거래 / 분실물 / 공동구매 공통)
// - 요구사항 반영:
//   1) 분실물 "완료 처리(회수)"는 버튼을 **게시자(글 작성자)에게만** 노출
//   2) 완료 처리 시 회수 거래내역은 **양쪽(게시자 + 상대방) 모두**에게 저장
//      → recipientEmails로 두 계정에 대해 각각 upsert
// - 타입스크립트 / Expo 환경
// - 스타일은 ChatRoomPage.styles.ts로 분리
// ---------------------------------------------------------

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

  // ✅ 방 유형 판별
  const isLost = raw?.source === 'lost';
  const isMarket = raw?.source === 'market';
  const isGroupBuy = raw?.source === 'groupbuy';

  // 카드(상단 요약) 메타
  const cardTitle: string = isMarket ? (raw?.productTitle ?? '게시글 제목') : (raw?.postTitle ?? '게시글 제목');
  const cardImageUri: string | undefined = isMarket ? raw?.productImageUri : raw?.postImageUri;

  // 중고거래 가격 라벨
  const priceLabel = useMemo(() => {
    if (!isMarket) return '';
    const price = raw?.productPrice;
    if (typeof price === 'number' && price > 0) return `₩ ${price.toLocaleString('ko-KR')}`;
    if (price === 0) return '나눔';
    return '';
  }, [isMarket, raw?.productPrice]);

  // 분실물 카드 보조 정보
  const placeLabel: string = isLost ? raw?.place ?? '장소 정보 없음' : '';
  const purposeBadge: string = isLost ? (raw?.purpose === 'lost' ? '분실' : '습득') : '';
  const recruitLabel: string = isGroupBuy ? raw?.recruitLabel ?? '' : '';

  // 방 아이디 파생
  const proposedId = raw?.roomId ?? deriveRoomIdFromParams(raw);
  const [roomId] = useState<string | null>(proposedId ?? null);
  const initialMessage: string | undefined = raw?.initialMessage;

  // ✅ 게시자 닉네임 / 내 닉네임
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

  // ✅ 게시자 식별값(이메일/ID)을 넓게 수집 (route 파라미터의 다양한 키 호환)
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

  // 🔧 null → undefined 정규화 (타입 안전)
  const authorEmailU: string | undefined = authorEmailAny ?? undefined;
  const authorIdU: string | number | undefined =
    (authorIdAny ?? undefined) as string | number | undefined;

  // ✅ 권한: 관리자/작성자 판별 (일부 기능에 사용)
  const { isOwner } = usePermissions({
    authorId: authorIdU,
    authorEmail: authorEmailU,
    routeParams: { isOwner: raw?.isOwner },
  });

  // 내 세션 아이덴티티 로드
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
  const identityReady = (myEmail !== null || myId !== null); // ✅ 로드 완료 플래그

  // 상대/내 식별 값(중고거래용)
  const sellerEmail = raw?.sellerEmail ?? raw?.authorEmail ?? undefined;
  const buyerEmail  = raw?.buyerEmail  ?? raw?.opponentEmail ?? raw?.userEmail ?? undefined;
  const sellerId = raw?.sellerId ?? raw?.authorId ?? undefined;
  const buyerId  = raw?.buyerId  ?? raw?.opponentId ?? raw?.userId ?? undefined;

  // 닉네임 소스 확장
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

  // ✅ 헤더 타이틀: 항상 "상대 닉네임"
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

  // 채팅 데이터 훅
  const {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment
  } = useChatRoom(roomId ?? '');

  // ✅ 분실물 방 판정 (유연: source 또는 힌트로 판정)
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

  // ✅ postId 안전 추출 (여러 키 호환)
  const lostPostIdFromAny: string | null = useMemo(() => {
    return (
      (raw?.postId && String(raw.postId)) ||
      (raw?.id && String(raw.id)) ||
      (raw?.post_id && String(raw.post_id)) ||
      (raw?.origin?.params?.postId && String(raw.origin.params.postId)) ||
      (raw?.origin?.params?.id && String(raw.origin.params.id)) ||
      null
    );
  }, [raw]);

  // ✅ "게시자 전용" 노출을 위한 엄격한 작성자 판별 (이메일 정확 일치)
  const isAuthorStrict = useMemo(() => {
    const n = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const me = n(myEmail);
    const author = n(authorEmailAny);
    return !!me && !!author && me === author;
  }, [myEmail, authorEmailAny]);

  // ✅ 완료 버튼 노출 조건: 분실물 방 + postId 존재 + "게시자" 본인일 때만
  const showLostClose = isLostContext && !!lostPostIdFromAny && isAuthorStrict;

  // ✅ 상대방 이메일 (양쪽 회수내역 반영을 위해 필요)
  const opponentEmail: string | null = useMemo(() => {
    return (raw?.opponentEmail ?? raw?.buyerEmail ?? null) || null;
  }, [raw?.opponentEmail, raw?.buyerEmail]);

  // ✅ 분실물 "완료 처리(회수)" 훅
  // - recipientEmails: 게시자 + 상대방 모두 전달 → 양쪽 계정의 거래내역에 저장
  const { lostStatus, handleCloseLost } = useLostClose({
    roomId: roomId ?? '',
    initial: (raw?.initialLostStatus as 'OPEN' | 'RESOLVED') ?? 'OPEN',
    pushMessage: (msg) => setMessages(prev => [...prev, msg]),

    postId: lostPostIdFromAny ?? undefined,
    postTitle: cardTitle,
    postImageUri: cardImageUri,
    place: isLost ? (raw?.place ?? undefined) : undefined,

    // ✅ 핵심: 두 계정 모두에게 회수 내역 반영
    recipientEmails: [
      authorEmailAny ?? undefined,      // 게시자
      opponentEmail ?? undefined,       // 상대방
    ].filter(Boolean) as string[],
  });

  // 차단 상태 판별
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

  // 신고/차단 메뉴 핸들러
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

  // 중고거래: 상태 변경 로컬 반영(데모)
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

  // 중고거래: 거래완료 스냅샷 기록(구매자 내역용)
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

  // ✅ 채팅방 최초 로드 시 메시지/방 미리 세팅
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
            params: raw,
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
      nickname: headerTitle,
    }).catch(() => {});
  }, [roomId, identityReady, headerTitle]);

  // 최초 자동 메시지 전송(있을 때만 1회)
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

  // 마지막 메시지 기준으로 프리뷰/시간 동기화
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
      nickname: headerTitle,
    }).catch(e => console.log('updateRoomOnSendSmart error', e));
  }, [messages, roomId, raw, headerTitle]);

  // 로딩 가드
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
      {/* 헤더: 상대 닉네임 */}
      <ChatHeader
        title={headerTitle}
        onPressBack={() => navigation.goBack()}
        onPressMore={() => setMenuVisible(true)}
      />

      {/* 상단 카드(게시글 요약) */}
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

        {/* 카드 액션: 일정잡기 / 판매상태 / (분실)완료처리 */}
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
                readOnly={false} // 게시자 전용으로 노출했으므로 활성
              />
            )}
          </View>
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
