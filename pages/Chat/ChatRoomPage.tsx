// pages/Chat/ChatRoomPage.tsx
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import styles from './ChatRoomPage.styles';

// ✅ 분리한 공통 컴포넌트/타입
import AttachmentBar from '@/components/Chat/AttachmentBar/AttachmentBar';
import ChatHeader from '@/components/Chat/ChatHeader/ChatHeader';
import MessageList from '@/components/Chat/MessageList/MessageList';
import MoreMenu from '@/components/Chat/MoreMenu/MoreMenu';
import type { ChatMessage } from '@/types/chat';

// ✅ 약속잡기 모달
import AppointmentModal from '@/components/Modal/AppointmentModal';

// 하단 입력 바
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

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

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

/**
 * 채팅방 페이지 (중고거래/분실물 공용)
 * - 상단 카드: 중고거래는 "가격", 분실물은 "장소 + 분실/습득 배지"
 * - 헤더/리스트/더보기/첨부/약속 모달은 공통 컴포넌트 사용
 */
export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>(); // NOTE: 팀 내 타입 변경 중이면 any 유지. union 타입 완료 시 제네릭 지정 권장.

  // ===== 약속 모달 상태 =====
  const [open, setOpen] = useState(false);

  // ===== 채팅/첨부/메뉴 상태 =====
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  // ======== 공용 표시값 매핑 (중고거래/분실물 분기) ========
  // 상세 → 채팅방으로 넘어온 파라미터(raw). 기존/신규(분실물) 모두 호환을 위해 any로 접근
  const raw = (route.params ?? {}) as any;

  // 1) 분기 플래그: source === 'lost' 면 분실물
  const isLost = raw?.source === 'lost';

  // 2) 헤더 타이틀
  // - market: sellerNickname
  // - lost  : posterNickname
  const headerTitle: string =
    isLost ? raw?.posterNickname ?? '닉네임' : raw?.sellerNickname ?? '닉네임';

  // 3) 카드 타이틀
  // - market: productTitle
  // - lost  : postTitle
  const cardTitle: string =
    isLost ? raw?.postTitle ?? '게시글 제목' : raw?.productTitle ?? '게시글 제목';

  // 4) 카드 썸네일
  // - market: productImageUri
  // - lost  : postImageUri
  const cardImageUri: string | undefined = isLost ? raw?.postImageUri : raw?.productImageUri;

  // 5) 보조 라인 (가격 ↔ 장소+배지)
  const priceLabel = useMemo(() => {
    if (isLost) return ''; // 분실물은 가격 표시 없음
    const price = raw?.productPrice;
    if (typeof price === 'number' && price > 0) return `₩ ${price.toLocaleString('ko-KR')}`;
    if (price === 0) return '나눔';
    return '';
  }, [isLost, raw?.productPrice]);

  const placeLabel: string = isLost ? raw?.place ?? '장소 정보 없음' : '';
  const purposeBadge: string = isLost ? (raw?.purpose === 'lost' ? '분실' : '습득') : '';

  // 6) 상세에서 보낸 첫 메시지
  const initialMessage: string | undefined = raw?.initialMessage;

  // 입장 직후, 상세에서 보낸 첫 메시지 처리
  useEffect(() => {
    if (!initialMessage?.trim()) return;
    const firstMsg: ChatMessage = {
      id: `init_${Date.now()}`,
      type: 'text',
      text: initialMessage,
      time: formatKoreanTime(),
      mine: true,
    };
    setMessages(prev => [...prev, firstMsg]);
    // MessageList가 onContentSizeChange로 자동 스크롤 처리
  }, [initialMessage]);

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
    Alert.alert('차단하기', '해당 사용자를 차단하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '차단', style: 'destructive', onPress: () => { /* TODO: 차단 API */ } },
    ]);
  };

  /** 약속잡기 버튼 → 모달 열기 (분실물도 전달 약속 용도) */
  const handleOpenSchedule = () => setOpen(true);

  /** DetailBottomBar(+ 버튼) → 새로 선택된 이미지 URIs 수신 */
  const handleAddImages = (uris: string[]) => {
    if (!uris?.length) return;
    setAttachments(prev => [...prev, ...uris]);
  };

  /** 썸네일에서 X 클릭 → 해당 첨부 제거 */
  const removeAttachmentAt = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  /** 전송: 첨부 이미지(있으면 먼저) → 텍스트(있으면 이어서) */
  const handleSend = (text: string) => {
    const now = formatKoreanTime();
    const trimmed = text.trim();
    const newItems: ChatMessage[] = [];

    // 1) 이미지 메시지
    if (attachments.length > 0) {
      for (const uri of attachments) {
        newItems.push({
          id: `img_${Date.now()}_${Math.random()}`,
          type: 'image',
          uri,
          time: now,
          mine: true,
        });
      }
    }
    // 2) 텍스트 메시지
    if (trimmed) {
      newItems.push({
        id: `txt_${Date.now()}`,
        type: 'text',
        text: trimmed,
        time: now,
        mine: true,
      });
    }
    if (newItems.length === 0) return;

    setMessages(prev => [...prev, ...newItems]);
    setAttachments([]); // 전송 후 첨부 초기화
    // MessageList가 자동 스크롤 처리
  };

  // 첨부 썸네일 바가 있으면 하단 패딩을 늘려 겹침 방지
  const extraBottomPad = attachments.length > 0 ? 96 : 0;

  return (
    <View style={styles.container}>
      {/* ===== 헤더: 뒤로가기 / 닉네임 / more ===== */}
      <ChatHeader
        title={headerTitle}
        onPressBack={() => navigation.goBack()}
        onPressMore={() => setMenuVisible(true)}
      />

      {/* ===== 상단 요약 카드 (중고/분실 공용) ===== */}
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

          {/* 제목/보조 라인 (market=가격 / lost=장소+배지) */}
          <View style={styles.infoWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {cardTitle}
            </Text>

            {isLost ? (
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
            ) : (
              <Text style={styles.price}>{priceLabel || '₩ 0'}</Text>
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

      {/* ===== 약속잡기 모달 =====
          - onSubmit 시 채팅에 시스템 메시지처럼 "📅 약속 제안"을 추가
          - 리스트 스크롤은 MessageList가 자동 처리
      */}
      <AppointmentModal
        visible={open}
        partnerNickname={headerTitle}
        onClose={() => setOpen(false)}
        onSubmit={({ date, time, place }) => {
          if (!date || !time || !place) {
            setOpen(false);
            return;
          }
          const now = formatKoreanTime();
          const proposal = `📅 약속 제안\n- 날짜: ${date}\n- 시간: ${time}\n- 장소: ${place}`;
          const msg: ChatMessage = {
            id: `apt_${Date.now()}`,
            type: 'text',
            text: proposal,
            time: now,
            mine: true,
          };
          setMessages(prev => [...prev, msg]);

          // TODO: POST /api/appointments { date, time, place, chatRoomId }
          setOpen(false);
        }}
        initialDate={undefined}
        initialTime={undefined}
        initialPlace={undefined}
      />
    </View>
  );
}
