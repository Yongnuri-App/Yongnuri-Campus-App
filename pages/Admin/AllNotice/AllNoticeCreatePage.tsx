// pages/Admin/AllNotice/AllNoticeCreatePage.tsx
import React, { useMemo, useState } from 'react';
import {
  Image,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styles from './AllNoticeCreatePage.styles';
import { postAllNotice } from '@/api/allNotice';
import { addBroadcast } from '@/utils/alarmStorage';

const TITLE_MAX = 18;
const DESC_MAX = 50;

export default function AllNoticeCreatePage() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && desc.trim().length > 0,
    [title, desc]
  );

  const onBack = () => navigation.goBack();

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;

    const rawTitle = title.trim();
    const finalTitle = rawTitle.startsWith('[관리자]') ? rawTitle : `[관리자] ${rawTitle}`;
    const finalDesc = desc.replace(/\s*\n+\s*/g, ' ').trim();

    if (finalTitle.length > TITLE_MAX + 5) { // [관리자] 접두 고려
      Alert.alert('안내', `제목은 공백 포함 ${TITLE_MAX}자 이내로 작성해주세요.`);
      return;
    }
    if (finalDesc.length > DESC_MAX) {
      Alert.alert('안내', `설명은 공백 포함 ${DESC_MAX}자 이내로 작성해주세요.`);
      return;
    }

    setSubmitting(true);
    try {
      // 1) 서버 전송
      await postAllNotice({ title: finalTitle, content: finalDesc });

      // 2) 로컬 브로드캐스트 캐시에 즉시 반영 → 알림 목록에서 바로 보이게
      await addBroadcast({
        id: `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: finalTitle,
        description: finalDesc,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('완료', '전체 공지를 등록했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.log('[ALL NOTICE POST ERR]', e?.message, e);
      Alert.alert(
        '오류',
        e?.response?.data?.message ??
          e?.message ??
          '등록 중 오류가 발생했어요. 권한/네트워크를 확인해주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Image
            source={require('../../../assets/images/back.png')}  // ✅ 경로 수정(3단계 ↑)
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전체 공지 등록</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.label}>
            제목 <Text style={{ color: '#9CA3AF' }}>({title.length}/{TITLE_MAX})</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="공백 포함 18자 내로 작성 가능"
            placeholderTextColor="#979797"
            value={title}
            onChangeText={setTitle}
            maxLength={TITLE_MAX}
            editable={!submitting}
          />

          <Text style={styles.label}>
            설명 <Text style={{ color: '#9CA3AF' }}>({desc.length}/{DESC_MAX})</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="공백 포함 50자 내로 작성 가능"
            placeholderTextColor="#979797"
            value={desc}
            onChangeText={setDesc}
            maxLength={DESC_MAX}
            multiline
            textAlignVertical="top"
            editable={!submitting}
          />
        </View>

        <View style={styles.submitWrap}>
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            activeOpacity={0.85}
            onPress={onSubmit}
            disabled={!canSubmit || submitting}
          >
            <Text style={styles.submitText}>{submitting ? '등록 중...' : '작성 완료'}</Text>
          </TouchableOpacity>
          <View style={{ height: 10 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
