import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DetailBottomBar from '../../../components/Bottom/DetailBottomBar';
import styles from './InquiryPage.styles';

/** 관리자 공지 저장 키(관리자 페이지에서 설정 예정) */
const ADMIN_INQUIRY_NOTICE_KEY = 'admin_inquiry_notice_v1';

type Msg = {
  id: string;
  text: string;
  who: 'me' | 'admin';
  ts: string; // HH:MM (간단표기)
};

function nowTime() {
  const d = new Date();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  const h12 = ((d.getHours() + 11) % 12) + 1;
  return `${ampm} ${h12.toString().padStart(2, '0')}:${mm}`;
}

export default function InquiryPage() {
  const navigation = useNavigation<any>();
  const [notice, setNotice] = useState<string>(
    '채팅 가능 시간은 09:00 ~ 18:00 시입니다.\n이 공지 영역은 관리자 페이지에서 설정 가능합니다.'
  );

  const [messages, setMessages] = useState<Msg[]>([
    // 필요하면 예시 메시지를 여기에 추가 가능
    // { id: 'm1', text: '문의 드립니다.', who: 'me', ts: '오전 10:30' },
    // { id: 'm2', text: '확인 후 답변드릴게요.', who: 'admin', ts: '오전 11:30' },
  ]);

  const scrollRef = useRef<ScrollView | null>(null);

  /** 관리자 공지 로드 */
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(ADMIN_INQUIRY_NOTICE_KEY);
        if (v && v.trim()) setNotice(v);
      } catch {
        // 무시(기본 안내 유지)
      }
    })();
  }, []);

  /** 전송 → 로컬 메시지로만 추가 (실제 전송/서버 연동은 추후 채팅 모듈에서 복사 예정) */
  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: Msg = { id: `${Date.now()}`, text: trimmed, who: 'me', ts: nowTime() };
    setMessages((prev) => [...prev, msg]);
    // 스크롤 맨 아래로
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 10);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* iOS StatusBar 높이 */}
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Image source={require('../../../assets/images/back_white.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문의하기</Text>
      </View>

      {/* 공지 카드 */}
      <View style={styles.noticeCard}>
        <Image
          source={require('../../../assets/images/campaign.png')}
          style={styles.noticeIcon}
          resizeMode="contain"
        />
        <Text style={styles.noticeText}>{notice}</Text>
      </View>

      {/* 메시지 영역 */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((m) => {
          const mine = m.who === 'me';
          return (
            <View key={m.id} style={[styles.msgRow, mine ? styles.msgRowMe : styles.msgRowOther]}>
              {!mine && <View style={styles.avatar} />}
              <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={[styles.msgText, mine ? styles.msgTextMe : styles.msgTextOther]}>
                  {m.text}
                </Text>
              </View>
              <Text style={styles.timeText}>{m.ts}</Text>
            </View>
          );
        })}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* 하단 채팅 바 (공용 컴포넌트 그대로 사용) */}
      <DetailBottomBar
        variant="chat"
        placeholder="메세지를 입력해주세요."
        onPressSend={handleSend}
        // 이미지 추가 이벤트는 나중에 필요 시 연결
        onAddImages={() => {}}
      />
    </SafeAreaView>
  );
}
