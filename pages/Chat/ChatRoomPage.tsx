// ChatRoomPage.tsx (리팩토링 후)
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

import useAuthorVerification from '@/hooks/useAuthorVerification'; // ✅ NEW
import useChatRoom from '@/hooks/useChatRoom';
import useChatRoomSetup from '@/hooks/useChatRoomSetup'; // ✅ NEW
import useLostClose from '@/hooks/useLostClose';
import usePermissions from '@/hooks/usePermissions';

import { blockUser, isBlockedUser, type BlockedUser } from '@/utils/blocked';
import { deriveRoomIdFromParams } from '@/utils/chatId';
import { mergeServerMessages } from '@/utils/chatMap';
import { enrichWithBuyer, pickOtherNickname, toSaleStatusLabel } from '@/utils/chatRoomUtils'; // ✅ NEW
import { getLocalIdentity } from '@/utils/localIdentity';

import { sendMessage } from '@/api/chat';
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

  // ✅ 작성자 확인 (NEW HOOK)
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
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => setOpen(true)}>
            <Image source={calendarIcon} style={styles.calendarIcon} />
            <Text style={styles.scheduleBtnText}>약속잡기</Text>
          </TouchableOpacity>
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
        onSubmit={({ date, time, place }) => {
          pushSystemAppointment(date ?? '', time ?? '', place ?? '');
          setOpen(false);
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