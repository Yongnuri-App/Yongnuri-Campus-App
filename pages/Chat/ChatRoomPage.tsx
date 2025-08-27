// pages/Chat/ChatRoomPage.tsx
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import styles from './ChatRoomPage.styles';

// ✅ 약속잡기 모달 (이미 @/components/Modal/AppointmentModal 로 관리 중인 경로 유지)
import AppointmentModal from '@/components/Modal/AppointmentModal';

// 하단 입력 바 (스마트 컴포넌트)
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

// 아이콘 (프로젝트 내 assets 경로에 맞춰 수정)
const backIcon = require('../../assets/images/back.png');
const moreIcon = require('../../assets/images/more.png');
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

/** 채팅 메시지 타입: 텍스트 / 이미지 */
type ChatMessage =
  | { id: string; type: 'text'; text: string; time: string; mine?: boolean }
  | { id: string; type: 'image'; uri: string; time: string; mine?: boolean };

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>(); // 필요 시 RootStackParamList['ChatRoom']로 제네릭 지정

  // ===== 약속 모달 상태 =====
  const [open, setOpen] = useState(false); // 약속잡기 모달 표시/비표시

  const {
    sellerNickname,
    productTitle,
    productPrice,
    productImageUri,
    initialMessage,
  } = route.params ?? {};

  // ===== 채팅 상태 =====
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]); // 전송 대기 첨부 이미지들
  const flatRef = useRef<FlatList<ChatMessage>>(null);
  const [menuVisible, setMenuVisible] = useState(false);

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
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 0);
  }, [initialMessage]);

  // 가격 표시
  const priceLabel = useMemo(() => {
    if (typeof productPrice === 'number' && productPrice > 0) {
      return `₩ ${productPrice.toLocaleString('ko-KR')}`;
    }
    if (productPrice === 0) return '나눔';
    return '';
  }, [productPrice]);

  // ===== 더보기 메뉴 액션 =====
  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert('신고하기', '해당 사용자를 신고하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '신고', style: 'destructive', onPress: () => {/* TODO: 신고 API */} },
    ]);
  };
  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert('차단하기', '해당 사용자를 차단하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '차단', style: 'destructive', onPress: () => {/* TODO: 차단 API */} },
    ]);
  };

  /** 약속잡기 버튼 → 모달 열기 */
  const handleOpenSchedule = () => {
    setOpen(true);
  };

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
    if (newItems.length === 0) return; // 전송할 것이 없으면 무시

    setMessages(prev => [...prev, ...newItems]);
    setAttachments([]); // 전송 후 첨부 초기화
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 0);
  };

  /** 채팅 아이템 렌더 */
  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.type === 'image') {
      // 이미지 메시지
      if (item.mine) {
        return (
          <View style={styles.rowRight}>
            <Text style={styles.timeRight}>{item.time}</Text>
            <View style={styles.imageBubbleMine}>
              <Image source={{ uri: item.uri }} style={styles.msgImageMine} />
            </View>
          </View>
        );
      }
      return (
        <View style={styles.rowLeft}>
          <View style={styles.avatar} />
          <View style={styles.imageBubbleOthers}>
            <Image source={{ uri: item.uri }} style={styles.msgImageOthers} />
          </View>
          <Text style={styles.timeLeft}>{item.time}</Text>
        </View>
      );
    }

    // 텍스트 메시지
    if (item.mine) {
      return (
        <View style={styles.rowRight}>
          <Text style={styles.timeRight}>{item.time}</Text>  
          <View style={styles.bubbleMine}>
            <Text style={styles.bubbleTextMine}>{item.text}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.rowLeft}>
        <View style={styles.avatar} />
        <View style={styles.bubbleOthers}>
          <Text style={styles.bubbleTextOthers}>{item.text}</Text>
        </View>
        <Text style={styles.timeLeft}>{item.time}</Text>
      </View>
    );
  };

  // 첨부 썸네일 바가 있으면 하단 패딩을 늘려 겹침 방지
  const extraBottomPad = attachments.length > 0 ? 96 : 0;

  return (
    <View style={styles.container}>
      {/* ===== 헤더: 뒤로가기 / 닉네임 / more ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={backIcon} style={styles.icon} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {sellerNickname ?? '닉네임'}
        </Text>

        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.moreBtn}>
          <Image source={moreIcon} style={styles.icon_more} />
        </TouchableOpacity>
      </View>

      {/* ===== 상품 요약 카드 ===== */}
      <View style={styles.productCardShadowWrap}>
        <View style={styles.productCard}>
          {/* 썸네일 */}
          <View style={styles.thumbWrap}>
            {productImageUri ? (
              <Image source={{ uri: productImageUri }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
          </View>
          {/* 제목/가격 */}
          <View style={styles.infoWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {productTitle ?? '게시글 제목'}
            </Text>
            <Text style={styles.price}>{priceLabel || '₩ 0'}</Text>
          </View>
        </View>

        {/* 약속잡기 버튼 */}
        <TouchableOpacity style={styles.scheduleBtn} onPress={handleOpenSchedule}>
          <Image source={calendarIcon} style={styles.calendarIcon} />
          <Text style={styles.scheduleBtnText}>약속잡기</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 채팅 리스트 ===== */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + extraBottomPad }]}
        renderItem={renderItem}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
      />

      {/* ===== 첨부 썸네일 바 (입력창 위) ===== */}
      {attachments.length > 0 && (
        <View style={styles.attachBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attachScroll}
          >
            {attachments.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.thumbWrapAttach}>
                <Image source={{ uri }} style={styles.thumbAttach} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeAttachmentAt(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeX}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ===== 하단 입력 바 ===== */}
      <DetailBottomBar
        variant="chat"
        placeholder="메세지를 입력해주세요."
        onPressSend={handleSend}                 // 텍스트/첨부 전송
        onAddImages={(uris) => setAttachments(prev => [...prev, ...uris])} // + 버튼 선택 결과
        attachmentsCount={attachments.length}    // 텍스트 없어도 첨부 있으면 전송 활성화
      />

      {/* ===== 더보기 메뉴 (신고/차단) ===== */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
              <Text style={styles.menuItemText}>신고하기</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Text style={styles.menuItemText}>차단하기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ===== 약속잡기 모달 =====
        - onSubmit 시 채팅에 시스템 메시지처럼 "📅 약속 제안"을 추가
        - 닫기/완료 후 리스트 맨 아래로 스크롤
      */}
      <AppointmentModal
        visible={open}
        partnerNickname={sellerNickname ?? '닉네임'}
        onClose={() => {
          setOpen(false);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 0);
        }}
        onSubmit={({ date, time, place }) => {
          // 유효성은 모달에서 버튼 비활성으로 1차 보장됨. 여기서는 방어코드만.
          if (!date || !time || !place) {
            setOpen(false);
            return;
          }

          // 📌 채팅에 약속 제안 메시지로 추가
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

          // TODO: 여기서 서버 API로 약속 생성/전송
          // ex) POST /api/appointments { date, time, place, chatRoomId }
          // 성공 시 상대에게도 "약속 제안" 시스템 메시지 전송 처리 필요

          setOpen(false);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 0);
        }}
        // 필요하면 초기 플레이스홀더 값 지정 가능
        initialDate={undefined}
        initialTime={undefined}
        initialPlace={undefined}
      />
    </View>
  );
}
