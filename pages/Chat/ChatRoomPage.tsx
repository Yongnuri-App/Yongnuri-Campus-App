// pages/Chat/ChatRoomPage.tsx
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import styles from './ChatRoomPage.styles';

// ✅ 공통 컴포넌트/타입
import AttachmentBar from '@/components/Chat/AttachmentBar/AttachmentBar';
import ChatHeader from '@/components/Chat/ChatHeader/ChatHeader';
import MessageList from '@/components/Chat/MessageList/MessageList';
import MoreMenu from '@/components/Chat/MoreMenu/MoreMenu';
import type { ChatMessage } from '@/types/chat';

// ✅ 약속잡기 모달
import AppointmentModal from '@/components/Modal/AppointmentModal';

// ✅ 분실물 마감 버튼 (심플 2단계: OPEN/RESOLVED)
import LostCloseButton, { type LostSimpleStatus } from '@/components/Chat/LostCloseButton/LostCloseButton';

// ✅ 하단 입력 바
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

// ✅ 로컬 저장 연동
import { appendOutboxImage, appendOutboxText, loadMessages } from '@/storage/chatMessagesStore';
import { updateRoomOnSend /*, markRoomRead*/ } from '@/storage/chatStore';

// ✅ 권한 훅 (판매자/작성자 여부 판별용)
import usePermissions from '@/hooks/usePermissions';

// ✅ 판매 상태 선택 컴포넌트 (한글 라벨 기반)
import SaleStatusSelector, { type SaleStatusLabel } from '@/components/Chat/SaleStatusSelector/SaleStatusSelector';

// 아이콘 (상단 카드에서만 필요)
const calendarIcon = require('../../assets/images/calendar.png');

/** 현재 시간을 "오전/오후 HH:MM" 포맷으로 반환 (12시간제) */
const formatKoreanTime = (d: Date = new Date()): string => {
  const h24 = d.getHours();
  const m = d.getMinutes();
  const ampm = h24 < 12 ? '오전' : '오후';
  const h12 = ((h24 + 11) % 12) + 1;
  const hh = String(h12).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${ampm} ${hh}:${mm}`;
};

/** 원본 네비 파라미터로부터 roomId 복구 (DetailBottomBar에서 만들던 규칙과 동일) */
function deriveRoomIdFromParams(params: any): string | null {
  if (!params || !params.source) return null;

  if (params.source === 'market') {
    const { postId, sellerNickname } = params;
    if (!postId || !sellerNickname) return null;
    return `market-${postId}-${sellerNickname}`;
  }
  if (params.source === 'lost') {
    const { postId, posterNickname } = params;
    if (!postId || !posterNickname) return null;
    return `lost-${postId}-${posterNickname}`;
  }
  if (params.source === 'groupbuy') {
    const { postId, authorNickname } = params;
    if (!postId || !authorNickname) return null;
    return `group-${postId}-${authorNickname}`;
  }
  return null;
}

/** 저장소에서 읽은 time(ISO 등)을 화면 표시용으로 맞춰주는 헬퍼 */
function ensureDisplayTimes(items: ChatMessage[]): ChatMessage[] {
  return items.map((m) => {
    if (typeof m.time === 'string' && (m.time.includes('오전') || m.time.includes('오후'))) {
      return m;
    }
    const d = m.time ? new Date(m.time) : new Date();
    return { ...m, time: formatKoreanTime(d) };
  });
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

/** ✅ 판매상태 매핑 유틸
 * - API(enum, 영문) ↔ UI(라벨, 한글) 간 변환 담당
 */
type ApiSaleStatus = 'ON_SALE' | 'RESERVED' | 'SOLD';

const toLabel = (s?: ApiSaleStatus): SaleStatusLabel => {
  switch (s) {
    case 'RESERVED':
      return '예약중';
    case 'SOLD':
      return '거래완료';
    case 'ON_SALE':
    default:
      return '판매중';
  }
};

const toApi = (l: SaleStatusLabel): ApiSaleStatus => {
  switch (l) {
    case '예약중':
      return 'RESERVED';
    case '거래완료':
      return 'SOLD';
    case '판매중':
    default:
      return 'ON_SALE';
  }
};

/**
 * 채팅방 페이지 (중고거래/분실물/공동구매 공용)
 * - 상단 카드:
 *   · market   → "가격"
 *   · lost     → "장소 + 분실/습득 배지"
 *   · groupbuy → "모집 인원(recruitLabel)"
 *
 * + 추가: 중고거래 && 판매자일 때만 "판매상태 선택" 노출
 * + 추가: 분실물 && 작성자일 때만 "마감 처리" 버튼 노출
 */
export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();

  // ===== 약속 모달 상태 =====
  const [open, setOpen] = useState(false);

  // ===== 채팅/첨부/메뉴 상태 =====
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  // ======== 공용 표시값 매핑 (market | lost | groupbuy 분기) ========
  const raw = (route.params ?? {}) as any;

  // 1) 분기 플래그
  const isLost = raw?.source === 'lost';
  const isMarket = raw?.source === 'market';
  const isGroupBuy = raw?.source === 'groupbuy';

  // 2) 헤더 타이틀(상대 닉네임)
  const headerTitle: string = isMarket
    ? raw?.sellerNickname ?? '닉네임'
    : isLost
    ? raw?.posterNickname ?? '닉네임'
    : raw?.authorNickname ?? '닉네임'; // groupbuy

  // 3) 카드 타이틀(게시글 제목)
  const cardTitle: string = isMarket
    ? raw?.productTitle ?? '게시글 제목'
    : raw?.postTitle ?? '게시글 제목';

  // 4) 카드 썸네일
  const cardImageUri: string | undefined = isMarket
    ? raw?.productImageUri
    : raw?.postImageUri;

  // 5) 보조 라인(한 줄): market=가격 / lost=장소(+배지 별도) / groupbuy=모집 인원
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

  // 6) 상세에서 보낸 첫 메시지 (optional)
  const initialMessage: string | undefined = raw?.initialMessage;

  // ===== roomId 복구 =====
  const roomId = raw?.roomId ?? deriveRoomIdFromParams(raw);

  // ===== 작성자 여부 판별 =====
  const { isOwner } = usePermissions({
    authorId: raw?.authorId,
    authorEmail: raw?.authorEmail,
    routeParams: { isOwner: raw?.isOwner },
  });

  // ===== DEV 전용: 소유자 강제 토글 (AUTO/null → OWNER/true → GUEST/false) =====
  const [devForceOwner, setDevForceOwner] = useState<boolean | null>(null);
  const effectiveIsOwner = (__DEV__ && devForceOwner !== null) ? devForceOwner : isOwner;

  // ===== 판매상태 라벨 state (UI 표기용, 중고거래 전용) =====
  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(
    toLabel(raw?.initialSaleStatus as ApiSaleStatus | undefined)
  );

  // ===== 분실물 마감 상태 (UI/로컬용) =====
  // - 네비 파라미터 raw?.initialLostStatus 가 있으면 반영, 없으면 OPEN
  const [lostStatus, setLostStatus] = useState<LostSimpleStatus>(
    (raw?.initialLostStatus as LostSimpleStatus) ?? 'OPEN'
  );

  // ===== 표시 조건 =====
  const showSaleStatus = isMarket && effectiveIsOwner && !!raw?.postId;              // 중고거래 판매 상태
  const showLostClose = isLost && effectiveIsOwner && !!raw?.postId;                 // 분실물 마감 버튼

  // ===== 판매상태 변경 핸들러 (라벨 → API enum 변환, 현재는 UI만) =====
  const handleChangeSaleStatus = useCallback(
    (nextLabel: SaleStatusLabel) => {
      setSaleStatusLabel(nextLabel); // 1) UI 라벨 즉시 반영
      const apiValue = toApi(nextLabel); // 2) API enum으로 변환

      // 3) TODO: 판매상태 PATCH/PUT API 연동 (postId 필요)
      //    예: await MarketRepo.updateStatus(raw.postId, apiValue)
      //    성공 시: 리스트/상세/채팅 상단 배지 등과 상태 동기화
      //    필요하면 ChatList 프리뷰 문구 갱신 등 추가 작업
      // console.log('[SaleStatus] change ->', nextLabel, '/', apiValue);
    },
    []
  );

  // ===== 분실물 마감 처리 (API 없이 로컬만) =====
  const handleCloseLost = useCallback(async () => {
    if (lostStatus === 'RESOLVED') return; // 이미 마감된 경우 방어

    setLostStatus('RESOLVED'); // 1) 화면 상태 즉시 반영

    // 2) 시스템 메시지로도 남겨두면 직관적
    const sysMsg: ChatMessage = {
      id: `sys_close_${Date.now()}`,
      type: 'text',
      text: '✅ 분실물 상태가 "해결됨"으로 변경되었습니다.',
      time: formatKoreanTime(),
      mine: true, // 시스템 메시지 스타일이면 상관없음
    };
    setMessages(prev => [...prev, sysMsg]);

    // 3) ChatList 프리뷰 갱신 (선택)
    if (roomId) {
      await updateRoomOnSend(roomId, '상태: 해결됨');
    }

    // TODO: 추후 API 연결 시 여기서 PATCH 호출 후 성공 시 setLostStatus('RESOLVED')
  }, [lostStatus, roomId]);

  // 초기 시딩 중복 방지
  const seededRef = useRef(false);

  // ===== 화면 포커스 시: 메시지 로드 + 초기 전송 시딩 =====
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        if (!roomId) return;

        // a) 저장된 메시지 로드
        const stored = await loadMessages(roomId);
        if (mounted) setMessages(ensureDisplayTimes(stored));

        // b) 최초 상세 진입 시 initialMessage가 있으면 1회만 시딩
        if (!seededRef.current && initialMessage?.trim()) {
          const next = await appendOutboxText(roomId, initialMessage.trim());
          if (mounted) setMessages(ensureDisplayTimes(next));
          await updateRoomOnSend(roomId, initialMessage.trim()); // ChatList 프리뷰 갱신
          seededRef.current = true;
        }

        // (옵션) 읽음 처리
        // await markRoomRead(roomId);
      })();

      return () => {
        mounted = false;
      };
    }, [roomId, initialMessage])
  );

  // ===== 더보기 메뉴 액션 =====
  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert('신고하기', '해당 사용자를 신고하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '신고', style: 'destructive', onPress: () => { /* TODO: 신고 API */ } },
    ]);
  };

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert('차단하기', '당신의 채팅 목록에서 숨겨집니다.', [
      { text: '취소', style: 'cancel' },
      { text: '차단', style: 'destructive', onPress: () => { /* TODO: 차단 API */ } },
    ]);
  };

  /** 약속잡기 버튼 → 모달 열기 */
  const handleOpenSchedule = () => setOpen(true);

  /** DetailBottomBar(+ 버튼) → 새로 선택된 이미지 URIs 수신 (즉시 전송 X, 전송 버튼에서 처리) */
  const handleAddImages = (uris: string[]) => {
    if (!uris?.length) return;
    setAttachments(prev => [...prev, ...uris]);
  };

  /** 썸네일에서 X 클릭 → 해당 첨부 제거 */
  const removeAttachmentAt = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  /**
   * 전송: 첨부 이미지(있으면 먼저) → 텍스트(있으면 이어서)
   * - 로컬 저장소에 append + 화면 state 갱신
   * - ChatList 프리뷰(updateRoomOnSend)도 갱신
   */
  const handleSend = async (text: string) => {
    if (!roomId) return;

    const trimmed = text.trim();
    let current: ChatMessage[] | null = null;

    // NOTE: 첨부만 보냈을 때 프리뷰가 사라지는 문제 방지용으로 카운트를 먼저 보관
    const attachmentCountBeforeSend = attachments.length;

    // 1) 이미지 메시지 먼저 저장/표시
    if (attachments.length > 0) {
      for (const uri of attachments) {
        const next = await appendOutboxImage(roomId, uri);
        current = next; // 마지막 값을 유지
      }
      if (current) setMessages(ensureDisplayTimes(current));
      setAttachments([]); // 전송 후 첨부 초기화
    }

    // 2) 텍스트 메시지 저장/표시
    if (trimmed) {
      const next = await appendOutboxText(roomId, trimmed);
      setMessages(ensureDisplayTimes(next));
    }

    // 3) ChatList 프리뷰 갱신
    if (trimmed) {
      await updateRoomOnSend(roomId, trimmed);
    } else if (attachmentCountBeforeSend > 0) {
      const label = attachmentCountBeforeSend === 1 ? '사진 1장' : `사진 ${attachmentCountBeforeSend}장`;
      await updateRoomOnSend(roomId, label);
    }
  };

  // 첨부 썸네일 바가 있으면 하단 패딩을 늘려 겹침 방지
  const extraBottomPad = attachments.length > 0 ? 96 : 0;

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

      {/* ✅ DEV 토글 스위치 (AUTO ↔ OWNER ↔ GUEST, 길게누르면 AUTO) 확인용 */}
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
            {isMarket && (
              <Text style={styles.price}>{priceLabel || '₩ 0'}</Text>
            )}

            {isLost && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.badgeBase,
                    raw?.purpose === 'lost' ? styles.badgeLost : styles.badgeFound,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {purposeBadge /* '분실' | '습득' */}
                  </Text>
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
                onChange={handleChangeSaleStatus}       // ✅ 라벨로 수신 → API enum 변환
              />
            )}

            {/* ✅ 분실물 + 작성자 + postId가 있을 때만: "완료 처리" 버튼 */}
            {showLostClose && (
              <LostCloseButton
                value={lostStatus}           // 'OPEN' | 'RESOLVED'
                onClose={handleCloseLost}    // 클릭 시 확인 모달 → 이 핸들러 실행
                readOnly={false}             // 작성자니까 false
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
        onPressSend={handleSend}
        onAddImages={handleAddImages}
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
          if (!date || !time || !place) {
            setOpen(false);
            return;
          }
          const proposal = `📅 약속 제안\n- 날짜: ${date}\n- 시간: ${time}\n- 장소: ${place}`;
          const msg: ChatMessage = {
            id: `apt_${Date.now()}`,
            type: 'text',
            text: proposal,
            time: formatKoreanTime(),
            mine: true,
          };
          setMessages(prev => [...prev, msg]);
          // TODO: appendOutboxText(roomId, proposal) + updateRoomOnSend(roomId, '약속 제안')
          setOpen(false);
        }}
        initialDate={undefined}
        initialTime={undefined}
        initialPlace={undefined}
      />

      {/* ===== 임시 디버그 배지 (개발 모드에서만 보임) ===== */}
      {/* {__DEV__ && (
        <View style={styles.debugBadge}>
          <Text style={styles.debugText}>source: {String(raw?.source)}</Text>
          <Text style={styles.debugText}>postId: {String(raw?.postId)}</Text>
          <Text style={styles.debugText}>authorId: {String(raw?.authorId)}</Text>
          <Text style={styles.debugText}>authorEmail: {String(raw?.authorEmail)}</Text>
          <Text style={styles.debugText}>isMarket: {String(isMarket)}</Text>
          <Text style={styles.debugText}>isOwner: {String(isOwner)}</Text>
          <Text style={styles.debugText}>effectiveIsOwner: {String(effectiveIsOwner)}</Text>
          <Text style={styles.debugText}>devForceOwner: {String(devForceOwner)}</Text>
          <Text style={styles.debugText}>showSaleStatus: {String(showSaleStatus)}</Text>
          <Text style={styles.debugText}>saleStatusLabel: {String(saleStatusLabel)}</Text>
          <Text style={styles.debugText}>lostStatus: {String(lostStatus)}</Text>
        </View>
      )} */}
    </View>
  );
}
