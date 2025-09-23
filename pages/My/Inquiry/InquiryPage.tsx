import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

import MessageList from '@/components/Chat/MessageList/MessageList';
import type { ChatMessage } from '@/types/chat';
import DetailBottomBar from '../../../components/Bottom/DetailBottomBar';

import useBusinessHours from '@/hooks/useBusinessHours';
import styles from './InquiryPage.styles';

/** 관리자 공지 저장 키(관리자 페이지에서 설정 예정) */
const ADMIN_INQUIRY_NOTICE_KEY = 'admin_inquiry_notice_v1';

// (선택) 관리자 설정으로 운영시간을 덮어쓰고 싶다면 이런 키를 약속해서 저장/로드하세요.
// 예: {"start":"09:00","end":"18:00","closedWeekdays":[0,6],"holidays":["2025-10-03"]}
const ADMIN_INQUIRY_HOURS_KEY = 'admin_inquiry_hours_v1';

type Msg = {
  id: string;
  text: string;
  who: 'me' | 'admin';
  ts: string; // "오전 10:30"
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

  // ⓐ 공지문 (관리자 페이지에서 AsyncStorage로 세팅된 값을 읽음)
  const [notice, setNotice] = useState<string>(
    '채팅 가능 시간은 09:00 ~ 18:00 시입니다.\n이 공지 영역은 관리자 페이지에서 설정 가능합니다.'
  );

  // ⓑ 문의 메시지 상태
  const [messages, setMessages] = useState<Msg[]>([]);

  // ⓒ (선택) 관리자 운영시간 설정 로드
  const [hoursCfg, setHoursCfg] = useState<{
    start?: string;
    end?: string;
    closedWeekdays?: number[];
    holidays?: string[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(ADMIN_INQUIRY_NOTICE_KEY);
        if (v && v.trim()) setNotice(v);
      } catch {/* 기본값 유지 */}

      try {
        const h = await AsyncStorage.getItem(ADMIN_INQUIRY_HOURS_KEY);
        if (h) {
          const parsed = JSON.parse(h);
          setHoursCfg(parsed);
        }
      } catch {/* 기본값 유지 */}
    })();
  }, []);

  // ✅ 운영시간 판단(기본 09:00~18:00, 주말 휴무 예시)
  const { isOpen, nextOpenAtLabel } = useBusinessHours({
    startHHmm: hoursCfg?.start ?? '09:00',
    endHHmm: hoursCfg?.end ?? '18:00',
    closedWeekdays: hoursCfg?.closedWeekdays ?? [0, 6], // 일/토 휴무
    holidays: hoursCfg?.holidays ?? [],                  // 공휴일은 필요 시 추가
    tzLabel: 'KST',
  });

  /** 전송: 운영시간 밖이면 막기 */
  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!isOpen) {
      // 운영시간 밖 → 전송 차단 + 안내
      Alert.alert(
        '운영시간이 아닙니다',
        nextOpenAtLabel
          ? `지금은 상담 운영시간이 아닙니다.\n운영 시작: ${nextOpenAtLabel}`
          : '지금은 상담 운영시간이 아닙니다.\n운영시간 내에 다시 시도해주세요.'
      );
      return;
    }

    const msg: Msg = { id: `${Date.now()}`, text: trimmed, who: 'me', ts: nowTime() };
    setMessages(prev => [...prev, msg]);

    // TODO: 서버 전송 로직 연결 시 이곳에 API 호출 추가
  };

  /** Inquiry 메시지 → 공용 ChatMessage로 변환 */
  const adaptedMessages: ChatMessage[] = useMemo(() => {
    return messages.map((m): ChatMessage => ({
      id: m.id,
      type: 'text',
      text: m.text,
      time: m.ts,
      mine: m.who === 'me',
    }));
  }, [messages]);

  return (
    <SafeAreaView style={styles.container}>
      {/* iOS 상태바 공간 */}
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
          <Image
            source={require('../../../assets/images/back_white.png')}
            style={styles.backIcon}
          />
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
        <Text style={styles.noticeText}>
          {/* 운영시간을 공지에 자동 반영하고 싶다면 아래 한 줄을 커스텀 */}
          {notice}
        </Text>
      </View>

      {/* ✅ 운영시간 밖이면 상단 안내 배너(선택) */}
      {!isOpen && (
        <View style={{ marginHorizontal: 20, marginTop: 8, padding: 12, borderRadius: 6, backgroundColor: '#FFF7E6' }}>
          <Text style={{ color: '#A86A00', fontSize: 12, lineHeight: 18 }}>
            지금은 상담 운영시간이 아닙니다.
            {nextOpenAtLabel ? ` 운영 시작: ${nextOpenAtLabel}` : ''}
          </Text>
        </View>
      )}

      {/* 메시지 리스트 */}
      <MessageList data={adaptedMessages} bottomInset={100} />

      {/* 하단 입력 바: 운영시간 밖이면 비활성 UX */}
      <DetailBottomBar
        variant="chat"
        placeholder={isOpen ? '메세지를 입력해주세요.' : '운영시간에만 상담이 가능합니다.'}
        onPressSend={handleSend}
        onAddImages={() => {}}
        // 컴포넌트에 disabled prop이 없으면, onPressSend에서 가드(위)로 차단하는 방식으로 충분
      />
    </SafeAreaView>
  );
}
