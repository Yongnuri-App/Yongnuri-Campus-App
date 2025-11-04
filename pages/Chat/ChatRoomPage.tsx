// pages/Chat/ChatRoomPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DetailBottomBar from '@/components/Bottom/DetailBottomBar';
import AttachmentBar from '@/components/Chat/AttachmentBar/AttachmentBar';
import ChatHeader, { type PostMeta } from '@/components/Chat/ChatHeader/ChatHeader';
import LostCloseButton from '@/components/Chat/LostCloseButton/LostCloseButton';
import MessageList from '@/components/Chat/MessageList/MessageList';
import MoreMenu from '@/components/Chat/MoreMenu/MoreMenu';
import SaleStatusSelector, { type SaleStatusLabel } from '@/components/Chat/SaleStatusSelector/SaleStatusSelector';
import AppointmentModal from '@/components/Modal/AppointmentModal';

import useAuthorVerification from '@/hooks/useAuthorVerification';
import useChatRoom from '@/hooks/useChatRoom';
import useChatRoomSetup from '@/hooks/useChatRoomSetup';
import useLostClose from '@/hooks/useLostClose';
import usePermissions from '@/hooks/usePermissions';
import useSaleStatusManager from '@/hooks/useSaleStatusManager';

import {
  blockUser,
  getBlockedAt,
  isBlockedUser,
  unblockUser, // ✅ 차단 시각 조회
  type BlockedUser
} from '@/utils/blocked';

import { deriveRoomIdFromParams } from '@/utils/chatId';
import { mergeServerMessages } from '@/utils/chatMap';
import { initHeaderPost, serverToLabel } from '@/utils/chatRoomHelpers';
import { enrichWithBuyer, pickOtherNickname, toSaleStatusLabel } from '@/utils/chatRoomUtils';
import { getLocalIdentity } from '@/utils/localIdentity';

import { deleteBlockUser, postBlockUser } from '@/api/blocks'; // ✅ 서버 차단/해제 API
import { sendMessage } from '@/api/chat';
import { getLostItemDetail } from '@/api/lost';
import { appendSystemMessage } from '@/storage/chatMessagesStore';
import { getDeletionCutoff, updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';

import type { RootStackParamList } from '@/types/navigation';
import styles from './ChatRoomPage.styles';

const calendarIcon = require('@/assets/images/calendar.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const raw = (route.params ?? {}) as any;

  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [headerNickname, setHeaderNickname] = useState<string | undefined>(undefined);
  const [headerPost, setHeaderPost] = useState<PostMeta | undefined>(() => initHeaderPost(raw));

  const proposedId = raw?.roomId ?? deriveRoomIdFromParams(raw);

  // ✅ 사용자 정보
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

  // ✅ 서버에서 분실물 상태 확인하는 state 추가 (이 부분이 새로 추가됨)
  const [serverLostStatus, setServerLostStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN');

  const enriched = useMemo(() => enrichWithBuyer(raw, myEmail, myId), [raw, myEmail, myId]);

  // ✅ 채팅방 초기화
  const { roomId, serverRoomId, ensureServerRoomId } = useChatRoomSetup({
    proposedId,
    raw,
    enriched,
    initialServerRoomId: raw?.serverRoomId,
    navigation,
  });

  // ✅ 권한 확인
  const { isOwner } = usePermissions({
    authorId: raw?.authorId ?? raw?.writerId ?? raw?.sellerId,
    authorEmail: raw?.authorEmail ?? raw?.writerEmail ?? raw?.sellerEmail,
    routeParams: { isOwner: raw?.isOwner },
  });

  // ✅ 닉네임 계산
  const computedTitle = useMemo(() => {
    return pickOtherNickname({
      meEmail: myEmail,
      meId: myId,
      isOwner,
      sellerEmail: raw?.sellerEmail ?? raw?.authorEmail,
      buyerEmail: raw?.buyerEmail ?? raw?.opponentEmail,
      sellerId: raw?.sellerId ?? raw?.authorId,
      buyerId: raw?.buyerId ?? raw?.opponentId,
      sellerName: raw?.sellerNickname ?? raw?.authorNickname ?? raw?.nickname,
      buyerName: raw?.buyerNickname ?? raw?.userNickname,
      opponentNickname: raw?.opponentNickname,
    });
  }, [myEmail, myId, isOwner, raw]);

  const titleFinal = headerNickname || computedTitle;

  // 상대(=구매자) ID를 서버 roomInfo에서 받아 보관할 상태
  const [buyerIdFromRoom, setBuyerIdFromRoom] = useState<number | null>(null);

  // ✅ 서버에서 받은 상대방 정보 저장
  const [opponentFromServer, setOpponentFromServer] = useState<{
    id: number | null;
    nickname: string | null;
    email?: string | null;
  } | null>(null);

  const { serverSellerInfo, serverLostAuthorInfo } = useAuthorVerification({
    serverRoomId,
    roomId,
    raw,
    onRoomDetailFetched: async (data) => {
      // ✅ 상대방 정보 저장 (신고/차단에 사용)
      if (data?.roomInfo) {
        setOpponentFromServer({
          id: data.roomInfo.opponentId ?? null,
          nickname: data.roomInfo.opponentNickname ?? null,
          email: null,
        });
        console.log('[ChatRoom] ✅ 상대방 정보 저장:', {
          id: data.roomInfo.opponentId,
          nickname: data.roomInfo.opponentNickname,
        });
      }

      // 헤더 보강 로직
      if (data?.roomInfo?.opponentNickname) {
        setHeaderNickname(data.roomInfo.opponentNickname);
        await upsertRoomOnOpen({
          roomId: roomId!,
          category: data.roomInfo.chatType === 'USED_ITEM' ? 'market' : data.roomInfo.chatType === 'LOST_ITEM' ? 'lost' : 'group',
          nickname: data.roomInfo.opponentNickname,
          productTitle: raw?.productTitle,
          productPrice: raw?.productPrice,
          productImageUri: raw?.productImageUri,
          preview: data?.messages?.[data.messages.length - 1]?.message,
          origin: { source: raw?.source, params: enriched },
        });
      }

      // ✅ 판매 상태 동기화
      if (data?.roomInfo?.chatType === 'USED_ITEM' && data?.roomInfo?.tradeStatus) {
        const serverStatus = data.roomInfo.tradeStatus;
        const uiLabel = serverToLabel(serverStatus);
        setSaleStatusLabel(uiLabel);
        console.log('[ChatRoom] ✅ 판매 상태 동기화:', serverStatus, '→', uiLabel);
        if (uiLabel === '예약중') setHasAppointment(true);
      }

      // 게시글 카드 보강
      if (data?.roomInfo) {
        const src: PostMeta['source'] =
          data.roomInfo.chatType === 'USED_ITEM' ? 'market'
          : data.roomInfo.chatType === 'LOST_ITEM' ? 'lost'
          : 'group';

        const pid = String(data.roomInfo.chatTypeId) || headerPost?.postId;
        if (pid) {
          const incoming: PostMeta = {
            source: src,
            postId: pid,
            title: data.roomInfo.title ?? headerPost?.title ?? '제목 없음',
            thumbnailUri: data.roomInfo.imageUrl ?? headerPost?.thumbnailUri,
          };

          if (src === 'market') {
            const priceNum = Number(data.roomInfo.price);
            incoming.priceLabel =
              Number.isFinite(priceNum) && priceNum > 0
                ? `₩ ${priceNum.toLocaleString('ko-KR')}`
                : (headerPost?.priceLabel ?? '나눔🩵');
          } else if (src === 'lost') {
            incoming.purpose = headerPost?.purpose;
            incoming.placeLabel = headerPost?.placeLabel;
          } else if (src === 'group') {
            incoming.recruitLabel = headerPost?.recruitLabel;
          }

          setHeaderPost(prev => ({ ...(prev ?? {} as any), ...incoming }));
        }
      }

      // ✅ 메시지 병합 (삭제 컷오프 이후만 반영)
      if (Array.isArray(data?.messages)) {
        const { userId, userEmail } = await getLocalIdentity();
        const myIdStr = userId != null ? String(userId) : null;
        const myEmailNorm = (userEmail ?? '').trim().toLowerCase();

        // 🔸 삭제 컷오프 조회
        const cutoff = await getDeletionCutoff({ originParams: enriched, roomId: roomId ?? undefined });

        // 🔸 컷오프 이후 서버 메시지만 사용
        const filtered = data.messages.filter((m: any) => {
          const ts = m?.createdAt ? new Date(m.createdAt).getTime() : 0;
          return !cutoff || (ts && ts > cutoff);
        });

        setMessages(prev => mergeServerMessages(prev, filtered, myIdStr, myEmailNorm));
      }
    },
  });

  // ✅ 채팅 컨텍스트
  const isMarketContext = useMemo(() => {
    const src = String(raw?.source ?? raw?.category ?? '').toLowerCase();
    const chatType = String(raw?.chatType ?? '').toUpperCase();
    return src === 'market' || headerPost?.source === 'market' || chatType === 'USED_ITEM';
  }, [raw, headerPost?.source]);

  const isLostContext = useMemo(() => {
    const src = String(raw?.source ?? raw?.category ?? '').toLowerCase();
    const chatType = String(raw?.chatType ?? '').toUpperCase();
    const hasLostHints = raw?.purpose === 'lost' || raw?.purpose === 'found' || typeof raw?.place === 'string';
    return src === 'lost' || headerPost?.source === 'lost' || chatType === 'LOST_ITEM' || hasLostHints;
  }, [raw, headerPost?.source]);

  const generalizedPostId = useMemo(() => {
    const pid = raw?.postId ?? raw?.id ?? raw?.post_id ?? headerPost?.postId;
    return pid != null ? String(pid) : null;
  }, [raw, headerPost?.postId]);

  // ✅ 채팅방 진입 시 서버에서 상태 가져오기 (이 부분이 새로 추가됨)
  useEffect(() => {
    (async () => {
      if (!generalizedPostId || !isLostContext) return;
      try {
        const detail = await getLostItemDetail(generalizedPostId);
        const resolved = detail.status === 'RETURNED' ? 'RESOLVED' : 'OPEN';
        setServerLostStatus(resolved);
        console.log('[ChatRoom] ✅ 서버 분실물 상태:', detail.status, '→', resolved);
      } catch (e) {
        console.log('[ChatRoom] 서버 상태 조회 실패, 기본값 사용:', e);
      }
    })();
  }, [generalizedPostId, isLostContext]);

  const isAuthorStrict = useMemo(() => {
    const me = (myEmail ?? '').trim().toLowerCase();
    const author = (raw?.authorEmail ?? '').trim().toLowerCase();
    return !!me && !!author && me === author;
  }, [myEmail, raw?.authorEmail]);

  // ✅ 판매자/작성자 여부
  const iAmSeller = useMemo(() => {
    const n = (v?: string | null) => (v ?? '').trim().toLowerCase();
    const sId = serverSellerInfo?.authorId ?? raw?.sellerId ?? raw?.authorId;
    const sEmail = serverSellerInfo?.authorEmail ?? raw?.sellerEmail ?? raw?.authorEmail;

    const meEmail = n(myEmail);
    const sellEmail = n(sEmail as any);
    const meId = myId ? String(myId) : '';
    const sellId = sId != null ? String(sId) : '';

    return (
      isOwner ||
      isAuthorStrict ||
      (!!meEmail && !!sellEmail && meEmail === sellEmail) ||
      (!!meId && !!sellId && meId === sellId)
    );
  }, [isOwner, isAuthorStrict, myEmail, myId, serverSellerInfo, raw]);

  // ✅ 판매자일 때만 buyerId 추출
  useEffect(() => {
    (async () => {
      if (!serverRoomId || !roomId) return;
      try {
        const { getRoomDetail } = await import('@/api/chat');
        const data = await getRoomDetail(serverRoomId);

        if (iAmSeller) {
          const oppId = data?.roomInfo?.opponentId ?? null;
          if (oppId != null) {
            const oppIdNum = Number(oppId);
            const myIdNum = myId != null ? Number(myId) : NaN;

            if (Number.isFinite(oppIdNum) && oppIdNum !== myIdNum) {
              setBuyerIdFromRoom(oppIdNum);
              console.log('[ChatRoom] ✅ 구매자 ID 확인:', oppIdNum);
            } else {
              setBuyerIdFromRoom(null);
              console.log('[ChatRoom] ⚠️ opponentId가 본인과 동일');
            }
          } else {
            setBuyerIdFromRoom(null);
            console.log('[ChatRoom] ⚠️ opponentId 없음');
          }
        } else {
          setBuyerIdFromRoom(null);
          console.log('[ChatRoom] 📦 구매자 입장 - buyerId 불필요');
        }
      } catch (e) {
        console.log('[ChatRoom] buyerId 추출 실패:', e);
        setBuyerIdFromRoom(null);
      }
    })();
  }, [serverRoomId, roomId, iAmSeller, myId]);

  const showLostClose = useMemo(() => {
    if (!isLostContext || !generalizedPostId) return false;
    return isAuthorStrict || !!serverLostAuthorInfo;
  }, [isLostContext, generalizedPostId, isAuthorStrict, serverLostAuthorInfo]);

  // ✅ 채팅 메시지 관리
  const {
    messages, setMessages,
    attachments, extraBottomPad,
    addAttachments, removeAttachmentAt,
    send, pushSystemAppointment,
  } = useChatRoom(roomId ?? '', undefined, {
    originParams: enriched,
    nickname: titleFinal,
  });

  // ✅ 판매 상태 + 약속 관리
  const {
    saleStatusLabel,
    setSaleStatusLabel,
    hasAppointment,
    setHasAppointment,
    handleChangeSaleStatus,
    recordTradeCompletion,
    createAppointment,
  } = useSaleStatusManager({
    initialStatus: toSaleStatusLabel(raw?.initialSaleStatus),
    generalizedPostId,
    serverRoomId,
    ensureServerRoomId,
    myId,
    buyerIdFromRoom,
    raw,
    enriched,
    isMarketContext,
    isLostContext,
    opponent: useMemo<BlockedUser | null>(() => {
      const idLike = raw?.opponentId ?? raw?.sellerId ?? raw?.authorId ?? raw?.opponentEmail;
      const nameLike = titleFinal || raw?.opponentNickname;
      if (!idLike || !nameLike) return null;
      return {
        id: String(idLike),
        name: String(nameLike),
        dept: raw?.opponentDept ?? raw?.department,
        avatarUri: raw?.opponentAvatarUri ?? raw?.avatarUri,
      };
    }, [raw, titleFinal]),
    setMessages,
    pushSystemAppointment,
  });

  // ✅ 분실물 완료 처리
  // ✅ 분실물 완료 처리
  const { /* lostStatus 제거, */ handleCloseLost } = useLostClose({
    roomId: roomId ?? '',
    initial: serverLostStatus,  // 서버에서 가져온 최신 상태를 기준으로
    // ✅ 시스템 메시지를 화면+스토리지에 모두 반영
    pushMessage: async (msg) => {
      setMessages(prev => [...prev, msg]);               // 즉시 화면 반영
      if ((msg as any).type === 'system' && roomId) {    // 영구 저장
        try { await appendSystemMessage(String(roomId), (msg as any).text ?? '처리가 완료되었습니다.'); }
        catch (e) { console.log('[ChatRoom] appendSystemMessage error', e); }
      }
    },
    postId: generalizedPostId ?? undefined,
    postTitle: raw?.postTitle ?? '게시글 제목',
    postImageUri: raw?.postImageUri,
    place: raw?.place,
    recipientEmails: [raw?.authorEmail, raw?.opponentEmail].filter(Boolean) as string[],
  });

  // ✅ 차단 관리
  const opponent = useMemo<BlockedUser | null>(() => {
    // ✅ 우선순위: 서버 정보 → raw 파라미터
    const idLike =
      opponentFromServer?.id ??
      raw?.opponentId ??
      raw?.sellerId ??
      raw?.authorId ??
      raw?.opponentEmail;

    const nameLike =
      (opponentFromServer?.nickname ?? (titleFinal || raw?.opponentNickname)) ?? null;

    if (!idLike || !nameLike) {
      console.log('[ChatRoom] ⚠️ opponent 생성 실패:', { idLike, nameLike });
      return null;
    }

    console.log('[ChatRoom] ✅ opponent 생성 성공:', { id: idLike, name: nameLike });
    return {
      id: String(idLike),
      name: String(nameLike),
      dept: raw?.opponentDept ?? raw?.department,
      avatarUri: raw?.opponentAvatarUri ?? raw?.avatarUri,
    };
  }, [opponentFromServer, raw, titleFinal]);

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedSince, setBlockedSince] = useState<number | null>(null); // ✅ 추가

  // 차단 여부 + 차단 시각 로드
  useEffect(() => {
    (async () => {
      if (!opponent?.id) {
        setIsBlocked(false);
        setBlockedSince(null);
        return;
      }
      const blocked = await isBlockedUser(opponent.id);
      setIsBlocked(blocked);
      const at = await getBlockedAt(opponent.id);
      setBlockedSince(at);
    })();
  }, [opponent?.id]);

  // ✅ UI 레이아웃
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const INPUT_BAR_HEIGHT = 56;
  const ATTACH_BAR_HEIGHT = attachments.length > 0 ? 88 : 0;
  const listBottomInset = INPUT_BAR_HEIGHT + ATTACH_BAR_HEIGHT + insets.bottom;
  const hasEnoughMessages = messages.length > 3;

  // ✅ 메시지 전송
  const sendWithServer = useCallback(async (text: string) => {
    await send(text);
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
          sender: Number(userId),
          message: trimmed,
          type: 'text',
        });
      }
    } catch (e) {
      console.log('[ChatRoom] sendWithServer error', e);
    }
  }, [send, serverRoomId, ensureServerRoomId]);

  // ✅ 판매 상태 변경 래퍼 (약속 필요 시 모달 열기)
  const handleSaleStatusChange = async (nextLabel: SaleStatusLabel) => {
    const result = await handleChangeSaleStatus(nextLabel);
    if (result === 'need-appointment') {
      Alert.alert(
        '약속이 필요해요',
        '예약중으로 변경하려면 먼저 약속을 생성해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '약속 잡기', onPress: () => setOpen(true) },
        ],
      );
    }
  };

  // ✅ 메뉴 액션: 신고
  const handleReport = () => {
    setMenuVisible(false);
    if (!opponent?.id) {
      Alert.alert('오류', '신고할 사용자 정보를 확인할 수 없어요.');
      return;
    }
    Alert.alert('신고하기', `${opponent.name} 님을 신고하시겠어요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '신고',
        style: 'destructive',
        onPress: () => {
          const params = {
            mode: 'compose' as const,
            targetNickname: opponent.name,
            targetDept: opponent.dept,
            targetEmail: opponentFromServer?.email ?? raw?.opponentEmail ?? undefined,
            targetUserId: opponent.id,
            targetKind: 'chat' as const,
          };
          console.log('[ChatRoom] 신고 화면으로 이동:', params);
          navigation.navigate('Report', params);
        },
      },
    ]);
  };

  // ✅ 메뉴 액션: 차단/해제
  const handleBlock = () => {
    setMenuVisible(false);
    if (!opponent?.id) {
      Alert.alert('오류', '상대 사용자 정보를 확인할 수 없어요.');
      return;
    }
    const isCurrentlyBlocked = isBlocked;

    Alert.alert(
      isCurrentlyBlocked ? '차단 해제' : '차단하기',
      isCurrentlyBlocked
        ? `${opponent.name} 님의 차단을 해제할까요?`
        : `${opponent.name} 님을 차단할까요?\n채팅/게시글에서 표시/상호작용이 제한될 수 있어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: isCurrentlyBlocked ? '차단 해제' : '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isCurrentlyBlocked) {
                // 서버 해제 → 로컬 해제 → UI 반영
                await deleteBlockUser(opponent.id).catch(() => {});
                await unblockUser(opponent.id);
                setIsBlocked(false);
                setBlockedSince(null);                 // ✅ 즉시 반영
              } else {
                // 서버 차단 → 로컬 기록(blockedAt) → UI 반영
                await postBlockUser({ blockedUserId: opponent.id });
                await blockUser({ ...opponent });
                setIsBlocked(true);
                setBlockedSince(Date.now());           // ✅ 즉시 반영
                // navigation.navigate('MyBlockedUsers'); // 필요 시 유지
              }
            } catch (e) {
              console.log('block/unblock error', e);
              Alert.alert(
                '오류',
                isCurrentlyBlocked
                  ? '차단 해제 중 문제가 발생했어요. 다시 시도해주세요.'
                  : '차단 중 문제가 발생했어요. 다시 시도해주세요.'
              );
            }
          },
        },
      ],
    );
  };

  // ✅ 게시글 존재 확인 (외부 리스트와 동기)
  const checkPostExistsExternally = useCallback(
    async (meta: { source: 'market' | 'lost' | 'group'; postId: string }) => {
      const keyBySource: Record<typeof meta.source, string> = {
        market: 'market_posts_v1',
        lost: 'lost_found_posts_v1',
        group: 'groupbuy_posts_v1',
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

  // ✅ ChatList 즉시 반영
  useEffect(() => {
    if (!roomId || !myEmail || !titleFinal) return;
    (async () => {
      try {
        await upsertRoomOnOpen({
          roomId,
          category: isMarketContext ? 'market' : isLostContext ? 'lost' : 'group',
          nickname: titleFinal,
          productTitle: isMarketContext ? raw?.productTitle : undefined,
          productPrice: isMarketContext ? raw?.productPrice : undefined,
          productImageUri: isMarketContext ? raw?.productImageUri : undefined,
          preview: raw?.initialMessage,
          origin: { source: raw?.source, params: enriched },
        });
      } catch (e) {
        console.log('upsertRoomOnOpen error', e);
      }
    })();
  }, [roomId, myEmail, titleFinal, isMarketContext, isLostContext, raw, enriched]);

  // ✅ 닉네임 동기
  useEffect(() => {
    if (!roomId || !myEmail || !titleFinal) return;
    updateRoomOnSendSmart({ roomId, originParams: enriched, nickname: titleFinal }).catch(() => {});
  }, [roomId, myEmail, titleFinal, enriched]);

  // ✅ 차단 이후 메시지 숨김 필터
  const opponentIdStr = useMemo(
    () => (opponent?.id ? String(opponent.id) : null),
    [opponent?.id]
  );

  const visibleMessages = useMemo(() => {
    if (!opponentIdStr || !blockedSince) return messages;
    return messages.filter((m: any) => {
      // 상대가 보낸 메시지?
      const sid = m?.senderId != null ? String(m.senderId) : null;
      const isOpponent = !!sid && sid === opponentIdStr;
      if (!isOpponent) return true; // 내가 보낸/시스템 메시지는 통과

      // 시간 판별
      const iso = m?.time || m?.createdAt;
      const ts = iso ? new Date(iso).getTime() : 0;
      if (!ts) return false; // 시간 없으면 보수적으로 숨김
      return ts < blockedSince; // 차단 시각 이전까지는 보이고 이후는 숨김
    });
  }, [messages, opponentIdStr, blockedSince]);

  // ✅ 로딩 상태
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
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
          {iAmSeller && (
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => setOpen(true)}>
              <Image source={calendarIcon} style={styles.calendarIcon} />
              <Text style={styles.scheduleBtnText}>약속잡기</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.actionsRight}>
          {isMarketContext && iAmSeller && !!generalizedPostId && (
            <SaleStatusSelector
              value={saleStatusLabel}
              onChange={handleSaleStatusChange}
              onCompleteTrade={recordTradeCompletion}
            />
          )}
          {showLostClose && (
            <LostCloseButton
              // ✅ 버튼 표시는 항상 서버/로컬에서 동기화된 값으로
              value={serverLostStatus}
              readOnly={false}
              onClose={async () => {
                // 1) 실제 완료 처리 로직 (서버 PATCH 포함) — hook 내부 수행
                await handleCloseLost();
                // 2) 버튼 상태를 즉시 동기화 (재입장해도 유지되도록 서버에도 이미 저장됨)
                setServerLostStatus('RESOLVED');
              }}
              // (선택) hook이 onClosed 콜백을 호출하지 않는다면 이 자리에서 시스템 메시지는 이미 저장됨
            />
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <MessageList
          data={visibleMessages}                                      // ✅ 필터된 메시지 사용
          bottomInset={hasEnoughMessages ? listBottomInset : 0}
        />
      </View>

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
        onSubmit={async (params) => {
          const success = await createAppointment(params);
          if (success) setOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
