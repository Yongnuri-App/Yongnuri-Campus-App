// pages/Admin/AdminPage/AllNotice/AllNoticeCreatePage.tsx
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native'; // ✅ CommonActions 제거
import styles from './AllNoticeCreatePage.styles';

const STORAGE_KEY = 'alarm_list_v1';
const uniqId = () => `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function AllNoticeCreatePage() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const canSubmit = useMemo(
    () => title.trim().length > 0 && desc.trim().length > 0,
    [title, desc]
  );

  const onBack = () => navigation.goBack();

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('알림', '제목과 설명을 입력해주세요.');
      return;
    }

    try {
      const now = new Date();
      const base = title.trim();
      const finalTitle = base.startsWith('[관리자]') ? base : `[관리자] ${base}`;
      const finalDesc = desc.replace(/\s*\n+\s*/g, ' ').trim();

      const newItem = {
        id: uniqId(),
        title: finalTitle,
        description: finalDesc,
        createdAt: now.toISOString(),
      };

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      // ✅ 스택을 유지한 채 목록으로 한 단계만 돌아가기
      navigation.goBack();
    } catch (e: any) {
      console.log(e);
      Alert.alert('오류', e?.message ?? '저장 중 문제가 발생했어요.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Image
            source={require('../../../assets/images/back.png')}
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
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="공백 포함 18자 내로 작성 가능"
            placeholderTextColor="#979797"
            value={title}
            onChangeText={setTitle}
            maxLength={18}
          />

          <Text style={styles.label}>설명</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="공백 포함 50자 내로 작성 가능"
            placeholderTextColor="#979797"
            value={desc}
            onChangeText={setDesc}
            maxLength={50}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.submitWrap}>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            activeOpacity={0.85}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitText}>작성 완료</Text>
          </TouchableOpacity>
          <View style={{ height: 10 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
