// pages/Chat/ChatRoomPage.tsx
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
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
import { deriveRoomIdFromParams } from '@/utils/chatId';

// ✅ 하단 입력 바
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

// 아이콘 (상단 카드 버튼)
const calendarIcon = require('../../assets/images/calendar.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

/** ✅ 판매상태 매핑 유틸 (라벨↔API enum)
 *  - 필요 시 mappers/saleStatus.ts로 분리 가능
 */
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

/**
 * 채팅방 페이지 (중고거래/분실물/공동구매 공용)
 * - 상단 카드: 썸네일/제목/보조라인(가격|장소+배지|모집 인원)
 * - 좌측 액션: 약속잡기
 * - 우측 액션(조건부): 판매상태 변경(중고거래+판매자), 분실물 마감(분실물+작성자)
 */
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

  // ===== 헤더 타이틀(상대 닉네임) =====
  const headerTitle: string = isMarket
    ? raw?.sellerNickname ?? '닉네임'
    : isLost
    ? raw?.posterNickname ?? '닉네임'
    : raw?.authorNickname ?? '닉네임'; // groupbuy

  // ===== 카드 타이틀/썸네일/보조 라벨 =====
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

  // ===== DEV 전용: OWNER/GUEST 강제 토글 (AUTO → OWNER → GUEST, 롱프레스: AUTO) =====
  const [devForceOwner, setDevForceOwner] = useState<boolean | null>(null);
  const effectiveIsOwner = (__DEV__ && devForceOwner !== null) ? devForceOwner : isOwner;

  // ===== 판매 상태 (UI 라벨 기반) =====
  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(
    toLabel(raw?.initialSaleStatus as ApiSaleStatus | undefined)
  );

  // ===== 채팅 로직 훅: 메시지/첨부/전송/시딩/시스템 메시지 =====
  const {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment
  } = useChatRoom(roomId, initialMessage);

  // ===== 분실물 마감 훅: 상태 + 시스템 메시지 주입 + 프리뷰 갱신 =====
  const { lostStatus, handleCloseLost } = useLostClose({
    roomId,
    initial: (raw?.initialLostStatus as 'OPEN' | 'RESOLVED') ?? 'OPEN',
    pushMessage: (msg) => setMessages(prev => [...prev, msg]),
  });

  // ===== 표시 조건 =====
  const showSaleStatus = isMarket && effectiveIsOwner && !!raw?.postId;
  const showLostClose = isLost && effectiveIsOwner && !!raw?.postId;

  // ===== 포커스 시: 메시지 로드 + 최초 시딩 =====
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
    Alert.alert('차단하기', '당신의 채팅 목록에서 숨겨집니다.', [
      { text: '취소', style: 'cancel' },
      { text: '차단', style: 'destructive', onPress: () => { /* TODO: 차단 API 연동 */ } },
    ]);
  };

  // ===== 판매상태 변경 (라벨 → API enum 매핑 후 서버 호출 예정) =====
  const handleChangeSaleStatus = (nextLabel: SaleStatusLabel) => {
    setSaleStatusLabel(nextLabel);
    const apiValue = toApi(nextLabel);
    // TODO: await MarketRepo.updateStatus(raw.postId, apiValue)
    // TODO: 성공 시 리스트/상세/채팅 상단 배지/프리뷰 동기화
  };

  // ===== 약속잡기 버튼 =====
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
      {/* ===== 헤더: 뒤로가기 / 닉네임 / more ===== */}
      <ChatHeader
        title={headerTitle}
        onPressBack={() => navigation.goBack()}
        onPressMore={() => setMenuVisible(true)}
      />

      {/* ✅ DEV 토글 스위치 (AUTO ↔ OWNER ↔ GUEST, 길게누르면 AUTO) */}
      {__DEV__ && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: '#D9D9D9',
            backgroundColor: '#FFFFFF',
            borderRadius: 6,
            marginTop: 40,
          }}
          onPress={() => setDevForceOwner(prev => (prev === null ? true : prev ? false : null))}
          onLongPress={() => setDevForceOwner(null)}
          activeOpacity={0.9}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#666' }}>
            {devForceOwner === null ? 'AUTO' : devForceOwner ? 'OWNER' : 'GUEST'}
          </Text>
        </TouchableOpacity>
      )}

      {/* ===== 상단 요약 카드 (market | lost | groupbuy 공용) ===== */}
      <View style={styles.productCardShadowWrap}>
        <View style={styles.productCard}>
          {/* 썸네일 */}
          <View style={styles.thumbWrap}>
            {cardImageUri ? (
              <Image source={{ uri: cardImageUri }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
          </View>

          {/* 제목/보조 라인 */}
          <View style={styles.infoWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {cardTitle}
            </Text>

            {/* 분기: 가격 / 장소+배지 / 모집 인원 */}
            {isMarket && <Text style={styles.price}>{priceLabel || '₩ 0'}</Text>}

            {isLost && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.badgeBase,
                    raw?.purpose === 'lost' ? styles.badgeLost : styles.badgeFound,
                  ]}
                >
                  <Text style={styles.badgeText}>{purposeBadge /* '분실' | '습득' */}</Text>
                </View>
                <Text style={styles.placeText} numberOfLines={1}>
                  {placeLabel}
                </Text>
              </View>
            )}

            {isGroupBuy && (
              <Text style={styles.groupBuyLabel} numberOfLines={1}>
                {recruitLabel /* 예: "현재 모집 인원 0명 (제한 없음)" */}
              </Text>
            )}
          </View>
        </View>

        {/* ===== 액션 행: 왼쪽=약속잡기 / 오른쪽=판매상태(조건부) + 마감(조건부) ===== */}
        <View style={styles.actionsRow}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity style={styles.scheduleBtn} onPress={handleOpenSchedule}>
              <Image source={calendarIcon} style={styles.calendarIcon} />
              <Text style={styles.scheduleBtnText}>약속잡기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRight}>
            {/* 중고거래 + 판매자 + postId가 있을 때만 노출 */}
            {showSaleStatus && (
              <SaleStatusSelector
                value={saleStatusLabel}                 // ✅ 라벨로 전달
                onChange={handleChangeSaleStatus}       // ✅ 라벨 수신 → API enum 변환
              />
            )}

            {/* 분실물 + 작성자 + postId가 있을 때만: "완료 처리" 버튼 */}
            {showLostClose && (
              <LostCloseButton
                value={lostStatus}        // 'OPEN' | 'RESOLVED' (useLostClose에서 관리)
                onClose={handleCloseLost} // 클릭 시 확인 모달 → 훅 핸들러
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

      {/* ===== 하단 입력 바 ===== */}
      <DetailBottomBar
        variant="chat"
        placeholder="메세지를 입력해주세요."
        onPressSend={send}
        onAddImages={addAttachments}
        attachmentsCount={attachments.length}
      />

      {/* ===== 더보기 메뉴 (신고/차단) ===== */}
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
          // ✅ 훅의 시스템 메시지 주입 함수로 UI 즉시 반영 (실제 저장/프리뷰 연동은 훅에 TODO)
          pushSystemAppointment(date, time, place);
          setOpen(false);
        }}
        initialDate={undefined}
        initialTime={undefined}
        initialPlace={undefined}
      />
    </View>
  );
}
