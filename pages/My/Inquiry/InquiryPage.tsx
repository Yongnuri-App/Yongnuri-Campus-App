// src/pages/Inquiry/InquiryPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

import MessageList from '@/components/Chat/MessageList/MessageList';
import type { ChatMessage } from '@/types/chat';
import DetailBottomBar from '../../../components/Bottom/DetailBottomBar';

import useBusinessHours from '@/hooks/useBusinessHours';
import styles from './InquiryPage.styles';
import { getPublicInquiryNotice } from '@/api/notice';

const ADMIN_INQUIRY_NOTICE_KEY = 'admin_inquiry_notice_v1'; // 캐시 키
const ADMIN_INQUIRY_HOURS_KEY = 'admin_inquiry_hours_v1';

type Msg = {
  id: string;
  text: string;
  who: 'me' | 'admin';
  ts: string;
};

function nowTime() {
  const d = new Date();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() < 12 ? '오전' : '오후';
  const h12 = ((d.getHours() + 11) % 12) + 1;
  return `${ampm} ${h12.toString().padStart(2, '0')}:${mm}`;
}

const DEFAULT_NOTICE =
  '채팅 가능 시간은 09:00 ~ 18:00 시입니다.\n이 공지 영역은 관리자 페이지에서 설정 가능합니다.';

export default function InquiryPage() {
  const navigation = useNavigation<any>();

  const [notice, setNotice] = useState<string>(DEFAULT_NOTICE);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [hoursCfg, setHoursCfg] = useState<{
    start?: string;
    end?: string;
    closedWeekdays?: number[];
    holidays?: string[];
  } | null>(null);

  // 유저 화면: 공개용 GET /notice → 실패 시 캐시/기본
  useEffect(() => {
    (async () => {
      const serverOrCached = await getPublicInquiryNotice(DEFAULT_NOTICE);
      if (serverOrCached && serverOrCached.trim()) {
        setNotice(serverOrCached);
      } else {
        try {
          const cached = await AsyncStorage.getItem(ADMIN_INQUIRY_NOTICE_KEY);
          if (cached && cached.trim()) setNotice(cached);
        } catch {/* ignore */}
      }
    })();
  }, []);

  // 운영시간(선택) 로드
  useEffect(() => {
    (async () => {
      try {
        const h = await AsyncStorage.getItem(ADMIN_INQUIRY_HOURS_KEY);
        if (h) setHoursCfg(JSON.parse(h));
      } catch {/* ignore */}
    })();
  }, []);

  const { isOpen, nextOpenAtLabel } = useBusinessHours({
    startHHmm: hoursCfg?.start ?? '09:00',
    endHHmm: hoursCfg?.end ?? '18:00',
    closedWeekdays: hoursCfg?.closedWeekdays ?? [0, 6],
    holidays: hoursCfg?.holidays ?? [],
    tzLabel: 'KST',
  });

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!isOpen) {
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

    // TODO: 실제 문의 메시지 전송 API 연결
  };

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
        <Text style={styles.noticeText}>{notice}</Text>
      </View>

      {/* 운영시간 배너(선택) */}
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

      {/* 하단 입력 바 */}
      <DetailBottomBar
        variant="chat"
        placeholder={isOpen ? '메세지를 입력해주세요.' : '운영시간에만 상담이 가능합니다.'}
        onPressSend={handleSend}
        onAddImages={() => {}}
      />
    </SafeAreaView>
  );
}
