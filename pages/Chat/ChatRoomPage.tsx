// pages/Chat/ChatRoomPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ 메인 캐시 업데이트용
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import styles from './ChatRoomPage.styles';

// ✅ 공통 컴포넌트
import AttachmentBar from '@/components/Chat/AttachmentBar/AttachmentBar';
import ChatHeader from '@/components/Chat/ChatHeader/ChatHeader';
import LostCloseButton from '@/components/Chat/LostCloseButton/LostCloseButton';
import MessageList from '@/components/Chat/MessageList/MessageList';
import MoreMenu from '@/components/Chat/MoreMenu/MoreMenu';
import SaleStatusSelector, { type SaleStatusLabel } from '@/components/Chat/SaleStatusSelector/SaleStatusSelector';
import AppointmentModal from '@/components/Modal/AppointmentModal';

// ✅ 권한 훅 (판매자/작성자 여부 판별)
import usePermissions from '@/hooks/usePermissions';

// ✅ 분리한 채팅 로직 훅 & 분실물 마감 훅
import useChatRoom from '@/hooks/useChatRoom';
import useLostClose from '@/hooks/useLostClose';

// ✅ 유틸
import { blockUser, isBlockedUser, type BlockedUser } from '@/utils/blocked';
import { deriveRoomIdFromParams } from '@/utils/chatId';

// ✅ 하단 입력 바
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

// 아이콘 (상단 카드 버튼)
const calendarIcon = require('../../assets/images/calendar.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

/** ✅ 판매상태 매핑 유틸 (라벨↔API enum) */
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

/** ✅ 메인 리스트 캐시 업데이트 (중고거래 상태 변경 시) */
async function updateMarketCacheStatus(postId: string, next: SaleStatusLabel) {
  try {
    const KEY = 'market_posts_v1';
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];

    const updated = Array.isArray(list)
      ? list.map((it: any) => (it?.id === postId ? { ...it, saleStatus: next } : it))
      : list;

    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('updateMarketCacheStatus error', e);
  }
}

export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const raw = (route.params ?? {}) as any;

  // ===== 약속 모달 상태 =====
  const [open, setOpen] = useState(false);

  // ===== 분기 플래그 =====
  const isLost = raw?.source === 'lost';
  const isMarket = raw?.source === 'market';
  const isGroupBuy = raw?.source === 'groupbuy';

  // ===== 헤더 타이틀 =====
  const headerTitle: string = isMarket
    ? raw?.sellerNickname ?? '닉네임'
    : isLost
    ? raw?.posterNickname ?? '닉네임'
    : raw?.authorNickname ?? '닉네임';

  // ===== 카드 데이터 =====
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

  // ===== roomId / 최초 인입 문구 =====
  const roomId = raw?.roomId ?? deriveRoomIdFromParams(raw);
  const initialMessage: string | undefined = raw?.initialMessage;

  // ===== 작성자 여부 판별 =====
  const { isOwner } = usePermissions({
    authorId: raw?.authorId,
    authorEmail: raw?.authorEmail,
    routeParams: { isOwner: raw?.isOwner },
  });

  const [devForceOwner, setDevForceOwner] = useState<boolean | null>(null);
  const effectiveIsOwner = (__DEV__ && devForceOwner !== null) ? devForceOwner : isOwner;

  // ===== 판매 상태 =====
  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(
    toLabel(raw?.initialSaleStatus as ApiSaleStatus | undefined)
  );

  // ===== 채팅 로직 =====
  const {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment
  } = useChatRoom(roomId, initialMessage);

  // ===== 분실물 마감 훅 =====
  const { lostStatus, handleCloseLost } = useLostClose({
    roomId,
    initial: (raw?.initialLostStatus as 'OPEN' | 'RESOLVED') ?? 'OPEN',
    pushMessage: (msg) => setMessages(prev => [...prev, msg]),
  });

  const showSaleStatus = isMarket && effectiveIsOwner && !!raw?.postId;
  const showLostClose = isLost && effectiveIsOwner && !!raw?.postId;

  // ===== 포커스 시 메시지 로드 =====
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        if (!mounted) return;
        await loadAndSeed();
      })();
      return () => { mounted = false; };
    }, [loadAndSeed])
  );

  // ===== 상대 정보 =====
  const opponent = useMemo<BlockedUser | null>(() => {
    const idLike =
      raw?.opponentId ??
      raw?.sellerId ??
      raw?.authorId ??
      raw?.userId ??
      raw?.opponentEmail ??
      raw?.sellerEmail ??
      raw?.authorEmail;

    const nameLike =
      raw?.opponentNickname ??
      raw?.sellerNickname ??
      raw?.authorNickname ??
      headerTitle;

    if (!idLike || !nameLike) return null;

    return {
      id: String(idLike),
      name: String(nameLike),
      dept: raw?.opponentDept ?? raw?.department ?? undefined,
      avatarUri: raw?.opponentAvatarUri ?? raw?.avatarUri ?? undefined,
    };
  }, [raw, headerTitle]);

  // ===== 차단 여부 체크 =====
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
  
  // ===== 더보기 메뉴 =====
  const [menuVisible, setMenuVisible] = useState(false);

  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert('신고하기', '해당 사용자를 신고하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '신고', style: 'destructive', onPress: () => { /* TODO: 신고 API 연동 */ } },
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

  // ===== 판매상태 변경 =====
  const handleChangeSaleStatus = async (nextLabel: SaleStatusLabel) => {
    setSaleStatusLabel(nextLabel);
    const apiValue = toApi(nextLabel);
    if (raw?.postId) {
      await updateMarketCacheStatus(raw.postId, nextLabel);
    }
  };

  const handleOpenSchedule = () => setOpen(true);

  if (!roomId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>채팅방 정보를 찾을 수 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== 헤더 ===== */}
      <ChatHeader
        title={headerTitle}
        onPressBack={() => navigation.goBack()}
        onPressMore={() => setMenuVisible(true)}
      />

      {/* ===== 상단 카드 ===== */}
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
            <TouchableOpacity style={styles.scheduleBtn} onPress={handleOpenSchedule}>
              <Image source={calendarIcon} style={styles.calendarIcon} />
              <Text style={styles.scheduleBtnText}>약속잡기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRight}>
            {showSaleStatus && (
              <SaleStatusSelector
                value={saleStatusLabel}
                onChange={handleChangeSaleStatus}
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

      {/* ===== 채팅 리스트 ===== */}
      <MessageList data={messages} bottomInset={100 + extraBottomPad} />

      {/* ===== 첨부 썸네일 바 ===== */}
      <AttachmentBar uris={attachments} onRemoveAt={removeAttachmentAt} />

      {/* ===== 하단 입력 바 or 차단 안내 ===== */}
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

      {/* ===== 더보기 메뉴 ===== */}
      <MoreMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onReport={handleReport}
        onBlock={handleBlock}
      />

      {/* ===== 약속잡기 모달 ===== */}
      <AppointmentModal
        visible={open}
        partnerNickname={headerTitle}
        onClose={() => setOpen(false)}
        onSubmit={({ date, time, place }) => {
          pushSystemAppointment(date, time, place);
          setOpen(false);
        }}
      />
    </View>
  );
}
