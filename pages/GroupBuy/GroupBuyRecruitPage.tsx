// pages/GroupBuy/GroupBuyRecruitPage.tsx
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

import styles, { COLORS } from './GroupBuyRecruitPage.styles';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';

type RecruitMode = 'unlimited' | 'limited' | null;

interface Props {
  navigation?: any;
}

const POSTS_KEY = 'groupbuy_posts_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

// 글자수 제한
const TITLE_MAX = 50;
const DESC_MAX = 1000;

// 로그인 전에 쓰는 로컬 사용자 ID 생성/보장
async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  let userEmail = await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY);
  return { userId, userEmail: userEmail ?? null };
}

const GroupBuyRecruitPage: React.FC<Props> = ({ navigation }) => {
  const { images, openAdd, removeAt, max } = useImagePicker({ max: 10 });

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [recruitMode, setRecruitMode] = useState<RecruitMode>(null);
  const [recruitCount, setRecruitCount] = useState<string>('');
  const [applyLink, setApplyLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValidUrl = (s: string) => {
    try {
      const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const canSubmit = useMemo(() => {
    if (!title.trim() || !desc.trim() || !applyLink.trim()) return false;
    if (!isValidUrl(applyLink.trim())) return false;
    if (recruitMode === null) return false;
    if (recruitMode === 'limited') {
      const n = Number(recruitCount);
      if (!recruitCount || Number.isNaN(n) || n <= 0) return false;
    }
    return true;
  }, [title, desc, applyLink, recruitMode, recruitCount]);

  // 제출
  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    const normalizedLink = /^https?:\/\//i.test(applyLink.trim())
      ? applyLink.trim()
      : `https://${applyLink.trim()}`;

    setSubmitting(true);
    try {
      const { userId, userEmail } = await ensureLocalIdentity();

      const newItem = {
        id: `${Date.now()}`,
        title: title.trim(),
        description: desc.trim(),
        recruit: {
          mode: recruitMode,
          count: recruitMode === 'limited' ? Number(recruitCount) : null,
        },
        applyLink: normalizedLink,
        images,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        // 오너 판별용
        authorId: userId,
        authorEmail: userEmail,
        authorName: '채희',
        authorDept: 'AI학부',
      };

      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));

      // 폼 리셋
      setTitle('');
      setDesc('');
      setRecruitMode(null);
      setRecruitCount('');
      setApplyLink('');

      // ✅ 스택 재구성: Main(공동구매 탭) + 방금 작성한 상세
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Main', params: { initialTab: 'group' } },
            { name: 'GroupBuyDetail', params: { id: newItem.id, isOwner: true } },
          ],
        })
      );
    } catch (e: any) {
      console.log(e);
      Alert.alert('오류', e?.message || '등록에 실패했어요. 잠시 후 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.inner, { paddingBottom: 70 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack?.()}>
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>공동구매 모집</Text>
          </View>
        </View>

        {/* 사진 */}
        <View className="section" style={styles.section as any}>
          <Text style={styles.label}>사진</Text>
          <PhotoPicker images={images} max={max} onAddPress={openAdd} onRemoveAt={removeAt} />
        </View>

        {/* 제목 (카운터 포함) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.label}>제목</Text>
            <Text style={{ color: '#979797' }}>{title.length}/{TITLE_MAX}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="글 제목"
            placeholderTextColor={COLORS.placeholder}
            value={title}
            onChangeText={setTitle}
            maxLength={TITLE_MAX}
          />
        </View>

        {/* 설명 (카운터 포함) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.label}>설명</Text>
            <Text style={{ color: '#979797' }}>{desc.length}/{DESC_MAX}</Text>
          </View>
          <View style={styles.card}>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="공동구매에 대한 설명을 작성해주세요."
              placeholderTextColor={COLORS.placeholder}
              value={desc}
              onChangeText={setDesc}
              multiline
              textAlignVertical="top"
              maxLength={DESC_MAX}
            />
          </View>
        </View>

        {/* 모집 인원 */}
        <View style={styles.section}>
          <Text style={styles.label}>모집 인원</Text>
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chipOutline, recruitMode === 'unlimited' && styles.chipFilledDark]}
              onPress={() => {
                setRecruitMode('unlimited');
                setRecruitCount('');
              }}
            >
              <Text
                style={[styles.chipTextDark, recruitMode === 'unlimited' && styles.chipTextLight]}
              >
                제한 없음
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chipOutline, recruitMode === 'limited' && styles.chipFilledDark]}
              onPress={() => setRecruitMode('limited')}
            >
              <Text
                style={[styles.chipTextDark, recruitMode === 'limited' && styles.chipTextLight]}
              >
                인원 제한
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.countRow}>
            <TextInput
              style={[
                styles.countInputBase,
                recruitMode === 'limited' ? styles.countInputActive : styles.countInputDisabled,
              ]}
              value={recruitCount}
              onChangeText={(txt) => setRecruitCount(txt.replace(/[^\d]/g, ''))}
              placeholder="10"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="number-pad"
              editable={recruitMode === 'limited'}
              maxLength={4}
            />
            <Text style={styles.countSuffix}>명</Text>
          </View>
        </View>

        {/* 모집 신청 링크 */}
        <View style={styles.section}>
          <Text style={styles.label}>모집 신청 링크</Text>
          <TextInput
            style={styles.input}
            placeholder="신청서를 받을 링크 주소를 입력해주세요."
            placeholderTextColor={COLORS.placeholder}
            value={applyLink}
            onChangeText={setApplyLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={styles.submitWrap}>
        <TouchableOpacity
          style={[styles.submitButton, { opacity: canSubmit && !submitting ? 1 : 0.6 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>{submitting ? '작성 중...' : '작성 완료'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default GroupBuyRecruitPage;
