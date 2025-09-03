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

// 하단 입력 바
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

// ✅ 로컬 저장 연동
import { appendOutboxImage, appendOutboxText, loadMessages } from '@/storage/chatMessagesStore';
import { updateRoomOnSend /*, markRoomRead*/ } from '@/storage/chatStore';

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
    // 이미 "오전/오후 HH:MM" 형태면 유지, 아니면 변환 시도
    if (typeof m.time === 'string' && (m.time.includes('오전') || m.time.includes('오후'))) {
      return m;
    }
    const d = m.time ? new Date(m.time) : new Date();
    return { ...m, time: formatKoreanTime(d) };
  });
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

/**
 * 채팅방 페이지 (중고거래/분실물/공동구매 공용)
 * - 상단 카드:
 *   · market   → "가격"
 *   · lost     → "장소 + 분실/습득 배지"
 *   · groupbuy → "모집 인원(recruitLabel)"
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
    } else if (attachments.length > 0) {
      const label = attachments.length === 1 ? '사진 1장' : `사진 ${attachments.length}장`;
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

        {/* 약속잡기 버튼 */}
        <TouchableOpacity style={styles.scheduleBtn} onPress={handleOpenSchedule}>
          <Image source={calendarIcon} style={styles.calendarIcon} />
          <Text style={styles.scheduleBtnText}>약속잡기</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 채팅 리스트 ===== */}
      <MessageList data={messages} bottomInset={100 + extraBottomPad} />

      {/* ===== 첨부 썸네일 바 ===== */}
      <AttachmentBar uris={attachments} onRemoveAt={removeAttachmentAt} />

      {/* ===== 하단 입력 바 ===== */}
      <DetailBottomBar
        variant="chat"
        placeholder="메세지를 입력해주세요."
        onPressSend={handleSend}                 // 텍스트/첨부 전송
        onAddImages={handleAddImages}            // + 버튼 선택 결과
        attachmentsCount={attachments.length}    // 텍스트 없어도 첨부 있으면 전송 활성화
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
          // 화면 표시는 바로 추가 (원하면 저장도 가능)
          const msg: ChatMessage = {
            id: `apt_${Date.now()}`,
            type: 'text',
            text: proposal,
            time: formatKoreanTime(),
            mine: true,
          };
          setMessages(prev => [...prev, msg]);

          // TODO: 서버 전송 / 저장도 원하면 appendOutboxText(roomId, proposal) + updateRoomOnSend(roomId, '약속 제안') 호출
          setOpen(false);
        }}
        initialDate={undefined}
        initialTime={undefined}
        initialPlace={undefined}
      />
    </View>
  );
}
