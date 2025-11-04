// src/pages/Admin/InquiryNoticeSettingPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styles from './InquiryNoticeSettingPage.styles';
import { getAdminInquiryNotice, postInquiryNotice } from '@/api/notice';

const DEFAULT_NOTICE =
  '채팅 가능 시간은 09:00 ~ 18:00 시입니다.\n이 공지 영역은 관리자 페이지에서 설정 가능합니다.';

export default function InquiryNoticeSettingPage() {
  const navigation = useNavigation<any>();
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const canSave = text.trim().length > 0;

  // 최초 로드: 관리자 전용 GET (/admin/notice) → 실패 시 캐시/기본
  useEffect(() => {
    let mounted = true;
    (async () => {
      const serverOrCached = await getAdminInquiryNotice(DEFAULT_NOTICE);
      if (!mounted) return;
      setText(serverOrCached || DEFAULT_NOTICE);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const onPressBack = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const onPressSave = async () => {
    const value = text.trim();
    if (!value) {
      Alert.alert('안내', '공지 내용을 입력해주세요.');
      return;
    }
    try {
      await postInquiryNotice(value);
      Alert.alert('완료', '문의하기 공지가 저장됐어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.log('[NOTICE SAVE ERR]', e?.message);
      Alert.alert('오류', '서버 저장에 실패했어요. 권한 또는 네트워크를 확인해 주세요.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onPressBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={require('../../../assets/images/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문의하기 공지</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 본문 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.noticeCard}>
          <Image
            source={require('../../../assets/images/campaign.png')}
            style={styles.noticeIcon}
            resizeMode="contain"
          />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="문의하기 상단에 노출될 공지를 입력하세요."
            placeholderTextColor="#9CA3AF"
            style={styles.noticeInput}
            multiline
            editable={!loading}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 하단 완료 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onPressSave}
          activeOpacity={canSave ? 0.9 : 1}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          disabled={!canSave || loading}
          accessibilityRole="button"
          accessibilityLabel="완료"
        >
          <Text style={styles.saveBtnText}>완료</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
