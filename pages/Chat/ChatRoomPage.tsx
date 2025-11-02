// ChatRoomPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createMakeDeal, type PostType } from '@/api/makedeal';
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

import { blockUser, isBlockedUser, type BlockedUser } from '@/utils/blocked';
import { deriveRoomIdFromParams } from '@/utils/chatId';
import { mergeServerMessages } from '@/utils/chatMap';
import { enrichWithBuyer, pickOtherNickname, toSaleStatusLabel } from '@/utils/chatRoomUtils';
import { getLocalIdentity } from '@/utils/localIdentity';

import { sendMessage } from '@/api/chat';
import { patchMarketStatus } from '@/api/market';
import marketTradeRepo from '@/repositories/trades/MarketTradeRepo';
import { updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';

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
  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(
    toSaleStatusLabel(raw?.initialSaleStatus)
  );
  const [hasAppointment, setHasAppointment] = useState(false);

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

  const enriched = useMemo(() => enrichWithBuyer(raw, myEmail, myId), [raw, myEmail, myId]);

  // ✅ 채팅방 초기화 (NEW HOOK)
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

  const { serverSellerInfo, serverLostAuthorInfo } = useAuthorVerification({
    serverRoomId,
    roomId,
    raw,
    onRoomDetailFetched: async (data) => {
      // 헤더 보강 로직
      if (data?.roomInfo?.opponentNickname) {
        setHeaderNickname(data.roomInfo.opponentNickname);
        await upsertRoomOnOpen({
          roomId: roomId!,
          category: data.roomInfo.chatType === 'USED_ITEM' ? 'market' : 'lost',
          nickname: data.roomInfo.opponentNickname,
          productTitle: raw?.productTitle,
          productPrice: raw?.productPrice,
          productImageUri: raw?.productImageUri,
          preview: data?.messages?.[data.messages.length - 1]?.message,
          origin: { source: raw?.source, params: enriched },
        });
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

      // 메시지 병합
      if (Array.isArray(data?.messages)) {
        const { userId, userEmail } = await getLocalIdentity();
        const myIdStr = userId != null ? String(userId) : null;
        const myEmailNorm = (userEmail ?? '').trim().toLowerCase();
        setMessages(prev => mergeServerMessages(prev, data.messages, myIdStr, myEmailNorm));
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
    return String(raw?.postId ?? raw?.id ?? raw?.post_id ?? headerPost?.postId ?? '') || null;
  }, [raw, headerPost?.postId]);

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

        // 🔥 판매자인 경우에만 opponent를 buyerId로 저장
        if (iAmSeller) {
          const oppId = data?.roomInfo?.opponentId ?? null;

          if (oppId != null) {
            const oppIdNum = Number(oppId);
            const myIdNum = myId != null ? Number(myId) : NaN;

            // 상대방이 나 자신이 아닌지 확인
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
          // 구매자 입장이면 buyerId 저장 안 함
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

  // ✅ 분실물 완료 처리
  const { lostStatus, handleCloseLost } = useLostClose({
    roomId: roomId ?? '',
    initial: (raw?.initialLostStatus as 'OPEN' | 'RESOLVED') ?? 'OPEN',
    pushMessage: (msg) => setMessages(prev => [...prev, msg]),
    postId: generalizedPostId ?? undefined,
    postTitle: raw?.postTitle ?? '게시글 제목',
    postImageUri: raw?.postImageUri,
    place: raw?.place,
    recipientEmails: [raw?.authorEmail, raw?.opponentEmail].filter(Boolean) as string[],
  });

  // ✅ 차단 관리
  const opponent = useMemo<BlockedUser | null>(() => {
    const idLike = raw?.opponentId ?? raw?.sellerId ?? raw?.authorId ?? raw?.opponentEmail;
    const nameLike = titleFinal || raw?.opponentNickname;
    if (!idLike || !nameLike) return null;
    return {
      id: String(idLike),
      name: String(nameLike),
      dept: raw?.opponentDept ?? raw?.department,
      avatarUri: raw?.opponentAvatarUri ?? raw?.avatarUri,
    };
  }, [raw, titleFinal]);

  const [isBlocked, setIsBlocked] = useState(false);
  useEffect(() => {
    (async () => {
      if (!opponent?.id) {
        setIsBlocked(false);
        return;
      }
      const blocked = await isBlockedUser(opponent.id);
      setIsBlocked(blocked);
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

  // ✅ 판매 상태 변경
  const handleChangeSaleStatus = async (nextLabel: SaleStatusLabel) => {
    // 사전 가드: 약속 없는데 '예약중'을 누르면 모달로 유도
    if (nextLabel === '예약중' && !hasAppointment) {
      Alert.alert(
        '약속이 필요해요',
        '예약중으로 변경하려면 먼저 약속을 생성해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '약속 잡기', onPress: () => setOpen(true) }, // ✅ 모달 오픈
        ],
      );
      return; // ❗️여기서 종료 → 서버 호출/상태 변경 안 함
    }

    const prev = saleStatusLabel;
    setSaleStatusLabel(nextLabel); // ⛳️ 낙관적 반영

    try {
      const postIdStr = generalizedPostId;
      if (!postIdStr) throw new Error('postId 미확인');

      const serverStatus = labelToServer(nextLabel); // 'SELLING' | 'RESERVED' | 'SOLD'

      // ✅ RESERVED/SOLD 시 buyerId 필수 검증
      let buyerId: number | null | undefined = undefined;
      if (serverStatus === 'RESERVED' || serverStatus === 'SOLD') {
        const rawCandidate =
          buyerIdFromRoom ?? raw?.buyerId ?? raw?.opponentId;
        if (rawCandidate == null) {
          throw new Error('구매자 정보를 확인할 수 없습니다.');
        }
        const candNum = Number(rawCandidate);
        const myIdNum = myId != null ? Number(myId) : NaN;
        if (!Number.isFinite(candNum)) {
          throw new Error('구매자 ID가 올바르지 않습니다.');
        }
        if (candNum === myIdNum) {
          throw new Error('본인을 구매자로 지정할 수 없습니다.');
        }
        buyerId = candNum;
        console.log('[handleChangeSaleStatus] ✅ 구매자 ID:', buyerId);
      }

      // ✅ chatRoomId 확보(없으면 ensure)
      let rid = serverRoomId;
      if (!rid) {
        rid = await ensureServerRoomId();
        if (!rid) throw new Error('서버 채팅방 ID를 확인할 수 없어요.');
      }

      // ✅ 서버 호출: chatRoomId까지 같이 전달
      await patchMarketStatus(Number(postIdStr), serverStatus, buyerId, Number(rid));

      // (선택) 로컬 캐시 보정 동일
      try {
        const KEY = 'market_posts_v1';
        const rawList = await AsyncStorage.getItem(KEY);
        const list = rawList ? JSON.parse(rawList) : [];
        const updated = Array.isArray(list)
          ? list.map((it: any) =>
              String(it?.id ?? it?.postId) === String(postIdStr)
                ? { ...it, saleStatus: nextLabel }
                : it
            )
          : list;
        await AsyncStorage.setItem(KEY, JSON.stringify(updated));
      } catch (e) {
        console.log('updateMarketCacheStatus error', e);
      }
    } catch (e: any) {
      setSaleStatusLabel(prev);
      const msg =
        e?.message ?? '상태 변경 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.';
      Alert.alert('오류', msg);
    }
  };

  // ✅ 거래 완료
  const recordTradeCompletion = useCallback(async () => {
    try {
      if (!isMarketContext || !raw?.postId) return;

      const { userEmail: meEmail, userId: meId } = await getLocalIdentity();
      const meEmailNorm = (meEmail ?? '').trim().toLowerCase();
      const meIdStr = (meId ?? '').toString();

      let buyerEmailY = raw?.buyerEmail ?? raw?.opponentEmail ?? null;
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
        title: raw?.productTitle ?? '게시글 제목',
        price: Number(raw?.productPrice) || undefined,
        image: raw?.productImageUri,
        sellerEmail: meEmail ?? raw?.sellerEmail ?? null,
        sellerId: meId ?? (raw?.sellerId ? String(raw.sellerId) : null),
        buyerEmail: buyerEmailY,
        buyerId: buyerIdY,
        postCreatedAt: raw?.postCreatedAt ?? raw?.createdAt,
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
  }, [isMarketContext, raw, opponent, setMessages]);

  // ✅ 메뉴 액션
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

  // ✅ 게시글 존재 확인
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
              onChange={handleChangeSaleStatus}
              onCompleteTrade={recordTradeCompletion}
            />
          )}
          {showLostClose && (
            <LostCloseButton value={lostStatus} onClose={handleCloseLost} readOnly={false} />
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <MessageList
          data={messages}
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
        onSubmit={async ({ date, time, place }) => {
          try {
            // 1) 유효성
            if (!date || !time || !place) {
              Alert.alert('확인', '날짜/시간/장소를 모두 선택해주세요.');
              return;
            }
            if (!serverRoomId) {
              Alert.alert('오류', '서버 채팅방 ID를 확인할 수 없어요.');
              return;
            }
            const postIdStr = generalizedPostId;
            if (!postIdStr) {
              Alert.alert('오류', '게시글 정보를 확인할 수 없어요.');
              return;
            }
            // 2) 상대(구매자) ID 계산 (판매자만 생성 가능)
            const buyerIdRaw =
              buyerIdFromRoom ??
              raw?.buyerId ??
              raw?.opponentId ??
              raw?.opponentUserId ??
              raw?.userId ??                 // 일부 화면에서 상대 userId로 전달되는 경우
              (enriched?.buyerId != null ? Number(enriched.buyerId) : null);

            const buyerId = buyerIdRaw != null ? Number(buyerIdRaw) : NaN;

            // 나 자신을 구매자로 잡는 실수를 방지 (내 ID와 같으면 무효)
            const myIdAsNum = myId != null ? Number(myId) : NaN;
            const buyerIdIsMe = Number.isFinite(buyerId) && Number.isFinite(myIdAsNum) && buyerId === myIdAsNum;

            if (!Number.isFinite(buyerId) || buyerIdIsMe) {
              console.log('[makeDeal] raw params:', raw);
              console.log('[makeDeal] buyerIdFromRoom:', buyerIdFromRoom, 'enriched.buyerId:', enriched?.buyerId);
              Alert.alert('오류', '상대 사용자 정보를 확인할 수 없어요.');
              return;
            }
            // 3) 게시글 타입
            const postType: PostType = isMarketContext ? 'USED_ITEM'
                                  : isLostContext   ? 'LOST_ITEM'
                                                    : 'USED_ITEM';
            // 4) 한글 라벨 → 서버 포맷 변환
            const yyyyMmDd = toServerDate(date);    // "2025-11-03"
            const hhmm     = toServerTime(time);    // "14:30"
            if (!yyyyMmDd || !hhmm) {
              Alert.alert('오류', '날짜/시간 형식을 변환하는 중 문제가 발생했어요.');
              return;
            }
            // 5) 서버 호출
            await createMakeDeal({
              chatRoomId: Number(serverRoomId),
              buyerId,
              postType,
              postId: Number(postIdStr),
              date: yyyyMmDd,
              time: hhmm,
              location: place,
            });

            // ✅ 약속 생성 성공 → 플래그 ON
            setHasAppointment(true);

            // 시스템 메시지 푸시 및 UX 처리
            pushSystemAppointment(date, time, place);
            setOpen(false);
            Alert.alert('완료', '약속이 생성되었습니다.');

            // await handleChangeSaleStatus('예약중');
          } catch (e: any) {
            console.log('[makeDeal] create error', e);
            Alert.alert('오류', '약속 생성 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ========== 헬퍼 함수 ==========

function initHeaderPost(raw: any): PostMeta | undefined {
  const isMarket = raw?.source === 'market';
  const isLost = raw?.source === 'lost';
  const isGroup = raw?.source === 'groupbuy';

  const src: PostMeta['source'] = isMarket ? 'market' : isLost ? 'lost' : 'group';
  const pid = String(raw?.postId ?? raw?.id ?? raw?.typeId ?? '');
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
}

// ====== 약속 모달이 넘겨주는 한글 라벨 → 서버 포맷 변환 유틸 ======
/** "2025년 11월 3일" → "2025-11-03" */
function toServerDate(koreanDate: string): string | null {
  try {
    // 공백 허용, '년 월 일' 한글 구분자 제거 후 split
    const m = koreanDate.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!y || !mo || !d) return null;
    const mm = String(mo).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

/** ================== 판매 상태 매핑 유틸 ================== */
/** 한글 라벨 → 서버 Enum */
function labelToServer(label: SaleStatusLabel): 'SELLING' | 'RESERVED' | 'SOLD' {
  switch (label) {
    case '판매중': return 'SELLING';
    case '예약중': return 'RESERVED';
    case '거래완료': return 'SOLD';
  }
}
/** 서버 Enum → 한글 라벨 (서버 값을 UI에 반영할 때 사용 가능) */
function serverToLabel(s: string): SaleStatusLabel {
  switch (s) {
    case 'SELLING': return '판매중';
    case 'RESERVED': return '예약중';
    case 'SOLD':    return '거래완료';
    default:        return '판매중';
  }
}

/** "오전 2시 05분" | "오후 12시 30분" → "HH:mm" (24시간) */
function toServerTime(koreanTime: string): string | null {
  try {
    const m = koreanTime.match(/(오전|오후)\s*(\d{1,2})시\s*(\d{1,2})분/);
    if (!m) return null;
    const ap = m[1]; // 오전/오후
    let h = Number(m[2]);
    const min = Number(m[3]);
    if (ap === '오전') {
      if (h === 12) h = 0;
    } else { // 오후
      if (h !== 12) h = h + 12;
    }
    const hh = String(h).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return null;
  }
}