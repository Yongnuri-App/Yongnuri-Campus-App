// src/pages/Chat/ChatRoomPage.tsx
// ---------------------------------------------------------
// 채팅방 화면 (중고거래 / 분실물 / 공동구매 공통)
// ---------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import styles from './ChatRoomPage.styles';

import AttachmentBar from '@/components/Chat/AttachmentBar/AttachmentBar';
import ChatHeader, { type PostMeta } from '@/components/Chat/ChatHeader/ChatHeader';
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

import { getRoomDetail, sendMessage } from '@/api/chat';
import { resolveRoomIdForOpen, updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';

// ✅ 서버 → 앱 메시지 매핑/병합
import { mergeServerMessages } from '@/utils/chatMap';

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

type ChatTypeEnum = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY';
function mapSourceToChatType(source?: string): ChatTypeEnum {
  switch ((source ?? '').toLowerCase()) {
    case 'lost':     return 'LOST_ITEM';
    case 'groupbuy': return 'GROUP_BUY';
    default:         return 'USED_ITEM';
  }
}
const toNum = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
};

function enrichWithBuyer(p: any, myEmail: string | null, myId: string | null) {
  const toStr = (v: unknown) => (v == null ? undefined : String(v));
  return {
    ...p,
    buyerEmail: p?.buyerEmail ?? p?.userEmail ?? toStr(myEmail),
    buyerId: toStr(p?.buyerId ?? p?.userId ?? myId),
    userEmail: p?.userEmail ?? toStr(myEmail),
    userId: p?.userId ?? toStr(myId),
  };
}

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

  if (amSeller) return buyerName || opponentNickname || '상대방';
  if (amBuyer)  return sellerName || opponentNickname || '상대방';
  if (sellerName && sellerName !== buyerName) return sellerName;
  return buyerName || opponentNickname || '상대방';
}

// ============================================================
export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const raw = (route.params ?? {}) as any;

  const [serverRoomId, setServerRoomId] = useState<number | undefined>(raw?.serverRoomId);
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
    if (price === 0) return '나눔🩵';
    return '';
  }, [isMarket, raw?.productPrice]);
  const placeLabel: string = isLost ? (raw?.place ?? '장소 정보 없음') : '';
  const purpose: 'lost' | 'found' | undefined =
    isLost ? (raw?.purpose === 'found' ? 'found' : 'lost') : undefined;
  const recruitLabel: string = isGroupBuy ? (raw?.recruitLabel ?? '') : '';

  const proposedId = raw?.roomId ?? deriveRoomIdFromParams(raw);
  const [roomId, setRoomId] = useState<string | null>(proposedId ?? null);

  const initialMessage: string | undefined = raw?.initialMessage;

  const authorEmailAny: string | null =
    raw?.authorEmail ?? raw?.writerEmail ?? raw?.posterEmail ?? raw?.sellerEmail ??
    raw?.postOwnerEmail ?? raw?.ownerEmail ?? raw?.lostOwnerEmail ??
    raw?.origin?.params?.authorEmail ?? raw?.origin?.params?.writerEmail ??
    raw?.origin?.params?.posterEmail ?? raw?.origin?.params?.sellerEmail ??
    raw?.origin?.params?.postOwnerEmail ?? raw?.origin?.params?.ownerEmail ??
    raw?.origin?.params?.lostOwnerEmail ?? null;

  const authorIdAny: string | number | null =
    raw?.authorId ?? raw?.writerId ?? raw?.posterId ?? raw?.sellerId ??
    raw?.postOwnerId ?? raw?.ownerId ??
    raw?.origin?.params?.authorId ?? raw?.origin?.params?.writerId ??
    raw?.origin?.params?.posterId ?? raw?.origin?.params?.sellerId ??
    raw?.origin?.params?.postOwnerId ?? raw?.origin?.params?.ownerId ?? null;

  const authorEmailU: string | undefined = authorEmailAny ?? undefined;
  const authorIdU: string | number | undefined =
    (authorIdAny ?? undefined) as string | number | undefined;

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

  const enriched = useMemo(() => enrichWithBuyer(raw, myEmail, myId), [raw, myEmail, myId]);

  const { isOwner } = usePermissions({
    authorId: authorIdU,
    authorEmail: authorEmailU,
    routeParams: { isOwner: raw?.isOwner },
  });

  const sellerEmail = raw?.sellerEmail ?? raw?.authorEmail ?? undefined;
  const buyerEmail  = raw?.buyerEmail  ?? raw?.opponentEmail ?? raw?.userEmail ?? undefined;
  const sellerId = raw?.sellerId ?? raw?.authorId ?? undefined;
  const buyerId  = raw?.buyerId  ?? raw?.opponentId ?? raw?.userId ?? undefined;

  const sellerName =
    raw?.sellerNickname ?? raw?.posterNickname ?? raw?.authorNickname ??
    raw?.writerNickname ?? raw?.nickname ?? '';
  const buyerName =
    raw?.buyerNickname ?? raw?.userNickname ?? raw?.opponentBuyerNickname ?? '';

  // ✅ 서버 닉네임 우선 적용을 위한 오버라이드 상태
  const [headerNickname, setHeaderNickname] = useState<string | undefined>(undefined);

  const computedTitle: string = useMemo(() => {
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

  // 최종 타이틀: 서버 응답(opponentNickname) 있으면 우선
  const titleFinal = headerNickname || computedTitle;

  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(
    toLabel(raw?.initialSaleStatus as ApiSaleStatus | undefined)
  );

  const {
    messages, setMessages,
    attachments, extraBottomPad,
    addAttachments, removeAttachmentAt,
    send, pushSystemAppointment,
  } = useChatRoom(roomId ?? '', /* seed은 useChatRoom이 담당 */ undefined, {
    originParams: enriched,
    nickname: titleFinal, // ✅ 현재 시점의 타이틀 전달
  });

  // ✅ 상단 게시글 카드 상태: 초기값(네이티브 파라미터) + 서버 보강
  const [headerPost, setHeaderPost] = useState<PostMeta | undefined>(() => {
    const src: PostMeta['source'] = isMarket ? 'market' : isLost ? 'lost' : 'group';
    const pid =
      (raw?.postId && String(raw.postId)) ||
      (raw?.id && String(raw.id)) ||
      (raw?.typeId && String(raw.typeId)) ||
      null;
    if (!pid) return undefined;

    const base: PostMeta = {
      source: src,
      postId: pid,
      title: raw?.productTitle || raw?.postTitle || '제목 없음',
      thumbnailUri: raw?.productImageUri || raw?.postImageUri,
    };

    if (src === 'market') {
      const p = raw?.productPrice ?? 0;
      base.priceLabel = p > 0 ? `₩ ${Number(p).toLocaleString('ko-KR')}` : '나눔🩵';
    } else if (src === 'lost') {
      base.purpose = raw?.purpose === 'found' ? 'found' : 'lost';
      base.placeLabel = raw?.place ?? '장소 정보 없음';
    } else if (src === 'group') {
      base.recruitLabel = raw?.recruitLabel ?? '';
    }
    return base;
  });

  // roomId 정규화 + 메시지 이관
  useEffect(() => {
    (async () => {
      if (!proposedId) {
        setRoomId(null);
        return;
      }
      try {
        const hasBuyerIdentity =
          !!(enriched?.buyerEmail || enriched?.buyerId || enriched?.userEmail || enriched?.userId);
        const shouldBypassResolve = !!raw?.roomId && hasBuyerIdentity;

        const canonical = shouldBypassResolve
          ? proposedId
          : await resolveRoomIdForOpen(enriched, proposedId);

        const finalId = canonical ?? proposedId;

        if (finalId !== proposedId) {
          const K = 'chat_messages_';
          const from = await AsyncStorage.getItem(K + proposedId);
          const to = await AsyncStorage.getItem(K + finalId);
          if (from && !to) {
            await AsyncStorage.setItem(K + finalId, from);
            await AsyncStorage.removeItem(K + proposedId);
          }
        }
        setRoomId(finalId);
      } catch {
        setRoomId(proposedId);
      }
    })();
  }, [proposedId, enriched, raw]);

  const isLostContext = useMemo(() => {
    const s =
      raw?.source ?? raw?.category ?? raw?.origin?.source ?? raw?.origin?.params?.source;
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
    recipientEmails: [authorEmailAny ?? undefined, opponentEmailX ?? undefined].filter(Boolean) as string[],
  });

  const opponent = useMemo<BlockedUser | null>(() => {
    const idLike =
      raw?.opponentId ?? raw?.sellerId ?? raw?.authorId ?? raw?.userId ??
      raw?.opponentEmail ?? raw?.sellerEmail ?? raw?.authorEmail;
    const nameLike = titleFinal || raw?.opponentNickname || sellerName || buyerName;
    if (!idLike || !nameLike) return null;
    return {
      id: String(idLike),
      name: String(nameLike),
      dept: raw?.opponentDept ?? raw?.department ?? undefined,
      avatarUri: raw?.opponentAvatarUri ?? raw?.avatarUri ?? undefined,
    };
  }, [raw, titleFinal, sellerName, buyerName]);

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

      const { userEmail: meEmail, userId: meId } = await getLocalIdentity();
      const meEmailNorm = (meEmail ?? '').trim().toLowerCase();
      const meIdStr = (meId ?? '').toString();

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
        sellerEmail: meEmail ?? (raw?.sellerEmail ?? null),
        sellerId: meId ?? (raw?.sellerId ? String(raw.sellerId) : null),
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
          senderEmail: null,
          senderId: null,
        } as any,
      ]);
    } catch (e) {
      console.log('recordTradeCompletion error', e);
      Alert.alert('오류', '거래완료 처리 중 문제가 발생했어요. 다시 시도해주세요.');
    }
  }, [isMarket, raw?.postId, raw?.buyerEmail, raw?.opponentEmail, raw?.buyerId, opponent?.id, cardTitle, cardImageUri, setMessages, raw?.productPrice, raw?.postCreatedAt, raw?.createdAt, raw?.sellerEmail, raw?.sellerId]);

  // ChatList 즉시 반영
  useEffect(() => {
    if (!roomId || !identityReady || !titleFinal) return;
    (async () => {
      try {
        await upsertRoomOnOpen({
          roomId,
          category: isMarket ? 'market' : isLost ? 'lost' : 'group',
          nickname: titleFinal,
          productTitle: isMarket ? raw?.productTitle : undefined,
          productPrice: isMarket ? raw?.productPrice : undefined,
          productImageUri: isMarket ? raw?.productImageUri : undefined,
          preview: initialMessage,
          origin: { source: isMarket ? 'market' : isLost ? 'lost' : 'groupbuy', params: enriched },
        });
      } catch (e) {
        console.log('upsertRoomOnOpen error', e);
      }
    })();
  }, [roomId, identityReady, titleFinal, isMarket, isLost, raw, initialMessage, enriched]);

  // 닉네임/미리보기 동기
  useEffect(() => {
    if (!roomId || !identityReady || !titleFinal) return;
    updateRoomOnSendSmart({ roomId, originParams: enriched, nickname: titleFinal }).catch(() => {});
  }, [roomId, identityReady, titleFinal, enriched]);

  // 전송(로컬 → 서버)
  const [creatingRoom, setCreatingRoom] = useState(false);
  const ensureServerRoomId = useCallback(async (): Promise<number | undefined> => {
    if (serverRoomId || creatingRoom) return serverRoomId;
    const src = (raw?.source ?? 'market') as 'market' | 'lost' | 'groupbuy';
    const typeId = toNum(raw?.postId ?? raw?.typeId);
    const toUserId = toNum(raw?.toUserId ?? raw?.opponentId ?? raw?.sellerId ?? raw?.authorId);
    const initMsg = (raw?.initialMessage ?? '').toString();
    if (!typeId || !toUserId) return undefined;
    setCreatingRoom(true);

    try {
      const { api } = await import('@/api/client');
      const payload = {
        type: mapSourceToChatType(src),
        typeId,
        toUserId,
        message: initMsg || '안녕하세요!',
        messageType: 'text',
      };
      const res = await api.post('/chat/rooms', payload);
      const rid: number | undefined = typeof res?.data?.roomInfo?.roomId === 'number'
        ? res.data.roomInfo.roomId
        : undefined;
      if (rid) {
        setServerRoomId(rid);
        navigation.setParams({ serverRoomId: rid } as any);
        return rid;
      }
    } catch (e) {
      console.log('[chat] ensureServerRoomId error', e);
    } finally {
      setCreatingRoom(false);
    }
    return undefined;
  }, [serverRoomId, creatingRoom, raw, navigation]);

  const sendWithServer = useCallback(async (text: string) => {
    await send(text); // 로컬 낙관
    try {
      const trimmed = text.trim();
      if (!trimmed) return;

      let rid = serverRoomId;
      if (!rid) {
        rid = await ensureServerRoomId();
        if (!rid) return;
      }

      const { userId } = await getLocalIdentity();
      if (userId != null) {
        await sendMessage({
          roomId: rid,
          sender: Number(userId), // 백엔드가 토큰기반이라도 정합성 유지
          message: trimmed,
          type: 'text',
        });
      }
    } catch (e) {
      console.log('[ChatRoom] sendWithServer error', e);
    }
  }, [send, serverRoomId, ensureServerRoomId]);

  // 상세에서 넘어온 initialMessage를 이미 서버에 저장했다면 여기선 seed 안 함
  const [initialPushed, setInitialPushed] = useState(false);
  useEffect(() => {
    (async () => {
      if (initialPushed) return;
      const msg = (initialMessage ?? '').toString().trim();
      if (!msg) return;
      const { userId } = await getLocalIdentity();
      if (!userId) return;

      // serverRoomId 없으면(상세에서 못 만들어줬다면) 1회 보장
      if (!serverRoomId) {
        let rid = await ensureServerRoomId();
        if (!rid) { setInitialPushed(true); return; }
        try {
          await sendMessage({ roomId: rid, sender: Number(userId), message: msg, type: 'text' });
        } catch (e) {
          console.log('[ChatRoom] initial sendMessage error', e);
        } finally {
          setInitialPushed(true);
        }
      } else {
        setInitialPushed(true);
      }
    })();
  }, [initialMessage, serverRoomId, ensureServerRoomId, initialPushed]);

  // 서버 메시지 가져와 병합 + 🔁 헤더 게시글/닉네임 보강
  useEffect(() => {
    (async () => {
      if (!serverRoomId || !roomId) return;
      try {
        const data = await getRoomDetail(serverRoomId);

        // ✅ 헤더 상대 닉네임: 서버 우선 덮어쓰기
        if (data?.roomInfo?.opponentNickname) {
          setHeaderNickname(data.roomInfo.opponentNickname);
          await upsertRoomOnOpen({
            roomId,
            category: isMarket ? 'market' : isLost ? 'lost' : 'group',
            nickname: data.roomInfo.opponentNickname,
            productTitle: isMarket ? raw?.productTitle : undefined,
            productPrice: isMarket ? raw?.productPrice : undefined,
            productImageUri: isMarket ? raw?.productImageUri : undefined,
            preview: data?.messages?.[data.messages.length - 1]?.message ?? undefined,
            origin: { source: isMarket ? 'market' : isLost ? 'lost' : 'groupbuy', params: enriched },
          });
        }

        // 🔁 상단 게시글 카드: 서버 정보로 안전 보강(없는 값만 채움)
        if (data?.roomInfo) {
          const src: PostMeta['source'] =
            data.roomInfo.chatType === 'USED_ITEM' ? 'market'
              : data.roomInfo.chatType === 'LOST_ITEM' ? 'lost'
              : 'group';

          const pid =
            (data.roomInfo.chatTypeId && String(data.roomInfo.chatTypeId)) ||
            headerPost?.postId ||
            null;

          if (pid) {
            const incoming: PostMeta = {
              source: src,
              postId: pid,
              title: data.roomInfo.title ?? headerPost?.title ?? '제목 없음',
              thumbnailUri: data.roomInfo.imageUrl ?? headerPost?.thumbnailUri,
            };

            if (src === 'market') {
              if (typeof data.roomInfo.price === 'string') {
                const priceNum = Number(data.roomInfo.price);
                incoming.priceLabel =
                  Number.isFinite(priceNum) && priceNum > 0
                    ? `₩ ${priceNum.toLocaleString('ko-KR')}`
                    : (headerPost?.priceLabel ?? '나눔🩵');
              } else {
                incoming.priceLabel = headerPost?.priceLabel ?? '나눔🩵';
              }
            } else if (src === 'lost') {
              incoming.purpose = headerPost?.purpose ?? undefined; // 서버측에 purpose가 없으면 유지
              incoming.placeLabel = headerPost?.placeLabel ?? undefined;
            } else if (src === 'group') {
              incoming.recruitLabel = headerPost?.recruitLabel ?? undefined;
            }

            setHeaderPost(prev => ({ ...(prev ?? {} as any), ...incoming }));
          }
        }

        if (Array.isArray(data?.messages)) {
          // ✅ 내 식별자 가져와서 병합에 전달
          const { userId, userEmail } = await getLocalIdentity();
          const myIdStr = userId != null ? String(userId) : null;
          const myEmailNorm = (userEmail ?? '').trim().toLowerCase();

          setMessages(prev =>
            mergeServerMessages(prev, data.messages, myIdStr, myEmailNorm)
          );
        }
      } catch (e: any) {
        if (e?.response?.status === 403) {
          Alert.alert('접근 불가', '이 채팅방의 참여자가 아니어서 열람할 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
        } else {
          console.log('[ChatRoom] getRoomDetail error', e?.response?.data || e);
        }
      }
    })();
  }, [serverRoomId, roomId, isMarket, isLost, raw, navigation, setMessages, enriched]); // headerPost는 의존성에서 제외

  const checkPostExistsExternally = useCallback(
    async (meta: { source: 'market'|'lost'|'group'; postId: string }) => {
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
      } catch {}
      return true;
    },
    []
  );

  if (!roomId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>채팅방을 준비하고 있어요…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 }) ?? 0}
    >
      <ChatHeader
        title={titleFinal}
        onPressBack={() => navigation.goBack()}
        onPressMore={() => setMenuVisible(true)}
        post={headerPost}
        checkPostExistsExternally={checkPostExistsExternally}
      />

      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => setOpen(true)}>
            <Image source={calendarIcon} style={styles.calendarIcon} />
            <Text style={styles.scheduleBtnText}>약속잡기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRight}>
          {isMarket && isOwner && !!raw?.postId && (
            <SaleStatusSelector
              value={saleStatusLabel}
              onChange={handleChangeSaleStatus}
              onCompleteTrade={recordTradeCompletion}
            />
          )}
          {showLostClose && (
            <LostCloseButton value={lostStatus} onClose={handleCloseLost} readOnly={false} />
          )}
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
          onPressSend={sendWithServer}
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
        partnerNickname={titleFinal}
        onClose={() => setOpen(false)}
        onSubmit={({ date, time, place }) => {
          pushSystemAppointment(date ?? '', time ?? '', place ?? '');
          setOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
