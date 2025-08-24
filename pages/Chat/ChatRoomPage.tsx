// pages/Chat/ChatRoomPage.tsx
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type { RootStackParamList } from '../../types/navigation';
import styles from './ChatRoomPage.styles';

// 하단 입력 바 재사용
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';

// 아이콘 (프로젝트 내 assets 경로에 맞춰 수정)
const backIcon = require('../../assets/images/back.png');
const moreIcon = require('../../assets/images/more.png');
const calendarIcon = require('../../assets/images/calendar.png');

/** 
 * 현재 시간을 "오전/오후 HH:MM" 포맷으로 반환
 * - 0시는 12시로, 13시는 1시로 변환 (12시간제)
 */
const formatKoreanTime = (d: Date = new Date()): string => {
  const h24 = d.getHours();             // 0~23
  const m = d.getMinutes();             // 0~59
  const ampm = h24 < 12 ? '오전' : '오후';
  const h12 = ((h24 + 11) % 12) + 1;    // 0→12, 13→1
  const hh = String(h12).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${ampm} ${hh}:${mm}`;
};

// 채팅 메시지 타입 (예시)
type ChatMessage = {
  id: string;
  text: string;
  time: string;     // "오전 10:30" 같은 포맷(실제는 timestamp 권장)
  mine?: boolean;   // 내가 보낸 메시지 여부
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;

export default function ChatRoomPage() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>(); // route.params 타입이 확실하면 제너릭 지정하세요.

  const {
    sellerNickname,
    productTitle,
    productPrice,
    productImageUri,
    initialMessage,
  } = route.params ?? {};

  // ✅ 더미 메시지 (디자인 확인용)
  const [messages, setMessages] = useState<ChatMessage[]>([
    // { id: 'm1', text: '안녕하세요!', time: '오전 10:30' },
    // { id: 'm2', text: '상품 상태 어떤가요?', time: '오전 10:31', mine: true },
  ]);

  // ✅ 입장 시(initialMessage가 있을 때만) 내 메시지로 추가
  useEffect(() => {
    if (!initialMessage?.trim()) return;
    const firstMsg: ChatMessage = {
        id: `init_${Date.now()}`,
        text: initialMessage,
        time: formatKoreanTime(),
        mine: true,
    };
    setMessages((prev) => [...prev, firstMsg]);
    // (선택) 살짝 지연 후 끝으로 스크롤
    // setTimeout(() => {
    //   flatRef.current?.scrollToEnd({ animated: true });
    // }, 0);
  }, [initialMessage]);

  // "₩ 12,000" 포맷
  const priceLabel = useMemo(() => {
    if (typeof productPrice === 'number') {
      return `₩ ${productPrice.toLocaleString('ko-KR')}`;
    }
    return '';
  }, [productPrice]);

  // 더보기 메뉴 토글
  const [menuVisible, setMenuVisible] = useState(false);

  // 신고/차단 동작 (실제 API 연결은 TODO)
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

  // 약속잡기 클릭 → 추후 모달 제작 예정
  const handleOpenSchedule = () => {
    // TODO: 약속잡기 모달 제작 후 연결
    Alert.alert('약속잡기', '약속잡기 모달은 추후 제작 예정입니다.'); 
  };

  // 메시지 전송 → 리스트 추가 (실제론 서버 전송 후 저장)
  const handleSend = (text: string) => {
    if (!text?.trim()) return;
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      text,
      time: formatKoreanTime(),
      mine: true,
    };
    setMessages((prev) => [ ...prev, newMsg ]);
  };

  // 채팅 아이템 렌더 (좌/우 말풍선)
  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.mine) {
      // 내가 보낸 메시지 (오른쪽, 진한 말풍선)
      return (
        <View style={styles.rowRight}>
          <Text style={styles.timeRight}>{item.time}</Text>
          <View style={styles.bubbleMine}>
            <Text style={styles.bubbleTextMine}>{item.text}</Text>
          </View>
        </View>
      );
    }
    // 상대방 메시지 (왼쪽, 회색 말풍선) — 왼쪽 프로필 원은 피그마대로 간단 Gray
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

  return (
    <View style={styles.container}>
      {/* ===== 헤더: 뒤로가기 / 닉네임 / more ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={backIcon} style={styles.icon} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{sellerNickname ?? '닉네임'}</Text>

        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.moreBtn}>
          <Image source={moreIcon} style={styles.icon_more} />
        </TouchableOpacity>
      </View>

      {/* ===== 상품 요약 카드 (이미지/제목/가격/약속잡기) ===== */}
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

      {/* ===== 채팅 메시지 리스트 ===== */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
      />

      {/* ===== 하단 입력 바: DetailBottomBar 재사용 ===== */}
      <DetailBottomBar
        placeholder="메시지를 입력해주세요."
        onPressSend={handleSend}
      />

      {/* ===== 더보기 메뉴 (신고/차단) - 간단 모달 ===== */}
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
    </View>
  );
}
