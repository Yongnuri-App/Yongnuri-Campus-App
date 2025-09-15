// pages/GroupBuy/GroupBuyRecruitPage.tsx
import React, { useMemo, useState, useCallback } from 'react';
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
import { CommonActions, useRoute } from '@react-navigation/native';

import styles, { COLORS } from './GroupBuyRecruitPage.styles';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useEditPost } from '../../hooks/useEditPost';
import { getCurrentUserEmail } from '../../utils/currentUser';

type RecruitMode = 'unlimited' | 'limited' | null;

interface Props {
  navigation?: any;
}

const POSTS_KEY = 'groupbuy_posts_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

const TITLE_MAX = 50;
const DESC_MAX = 1000;

async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const compatEmail = await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY);
  return { userId, compatEmail: compatEmail ?? null };
}

const GroupBuyRecruitPage: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<any>();
  const modeParam = route.params?.mode as 'create' | 'edit' | undefined;
  const editId = route.params?.id as string | undefined;
  const isEdit = modeParam === 'edit' && !!editId;

  return isEdit ? (
    <EditForm navigation={navigation} postId={editId!} />
  ) : (
    <CreateForm navigation={navigation} />
  );
};

export default GroupBuyRecruitPage;

/* =========================
 * Create (작성) 폼
 * =======================*/
const CreateForm: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [recruitMode, setRecruitMode] = useState<RecruitMode>(null);
  const [recruitCount, setRecruitCount] = useState<string>('');
  const [applyLink, setApplyLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { images, openAdd, removeAt, max } = useImagePicker({ max: 10 });

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

  const handleSubmitCreate = async () => {
    if (!canSubmit || submitting) return;

    const normalizedLink = /^https?:\/\//i.test(applyLink.trim())
      ? applyLink.trim()
      : `https://${applyLink.trim()}`;

    setSubmitting(true);
    try {
      const { userId, compatEmail } = await ensureLocalIdentity();

      // 표준 세션 이메일 우선
      let userEmail: string | null = await getCurrentUserEmail();
      if (!userEmail) userEmail = compatEmail;

      if (!userEmail) {
        Alert.alert('오류', '로그인이 필요합니다. 다시 로그인해 주세요.');
        setSubmitting(false);
        return;
      }

      // ✅ 타입 좁히기: TS가 recruitMode의 null 가능성을 알지 못하므로 명시
      const modeNarrowed = (recruitMode ?? 'unlimited') as Exclude<RecruitMode, null>;

      type GroupBuyPost = {
        id: string;
        title: string;
        description: string;
        recruit: { mode: 'unlimited' | 'limited'; count: number | null };
        applyLink: string;
        images: string[];
        likeCount: number;
        createdAt: string;
        authorId?: string | number;
        authorEmail?: string | null;
        authorName?: string;
        authorDept?: string;
      };

      const newItem: GroupBuyPost = {
        id: `${Date.now()}`,
        title: title.trim(),
        description: desc.trim(),
        recruit: {
          mode: modeNarrowed,
          count: modeNarrowed === 'limited' ? Number(recruitCount) : null,
        },
        applyLink: normalizedLink,
        images,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        authorId: userId,
        authorEmail: userEmail, // 이메일만 저장 → 상세에서 최신 닉/학부 조회
      };

      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));

      setTitle('');
      setDesc('');
      setRecruitMode(null);
      setRecruitCount('');
      setApplyLink('');

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

  const submitLabel = submitting ? '작성 중...' : '작성 완료';

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

        {/* 제목 */}
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

        {/* 설명 */}
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
          onPress={handleSubmitCreate}
          disabled={!canSubmit || submitting}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

/* =========================
 * Edit (수정) 폼
 * =======================*/
const EditForm: React.FC<{ navigation: any; postId: string }> = ({ navigation, postId }) => {
  const [submitting, setSubmitting] = useState(false);

  const { images, setImages, openAdd, removeAt, max } = useImagePicker({ max: 10 });

  const handleLoaded = useCallback((post: any) => {
    if (post.images && post.images.length) {
      setImages(post.images);
    }
  }, [setImages]);

  const {
    title, setTitle,
    desc, setDesc,
    mode: recruitMode, setMode: setRecruitMode,
    count: recruitCount, setCount: setRecruitCount,
    applyLink, setApplyLink,
    isValid,
    save,
  } = useEditPost({
    postId,
    postsKey: POSTS_KEY,
    onLoaded: handleLoaded,
  });

  const normalizedLink = () => {
    if (!applyLink?.trim()) return '';
    return /^https?:\/\//i.test(applyLink.trim()) ? applyLink.trim() : `https://${applyLink.trim()}`;
  };

  const canSubmit = !!isValid && !submitting;
  const submitLabel = submitting ? '수정 중...' : '수정 완료';

  const handleSubmitEdit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const ok = await save?.({ images, applyLink: normalizedLink() });
      if (ok) {
        Alert.alert('완료', '게시글을 수정했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        setSubmitting(false);
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('오류', e?.message || '수정에 실패했어요.');
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
            <Text style={styles.headerTitle}>공동구매 수정</Text>
          </View>
        </View>

        {/* 사진 */}
        <View className="section" style={styles.section as any}>
          <Text style={styles.label}>사진</Text>
          <PhotoPicker images={images} max={max} onAddPress={openAdd} onRemoveAt={removeAt} />
        </View>

        {/* 제목 */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.label}>제목</Text>
            <Text style={{ color: '#979797' }}>{(title ?? '').length}/{TITLE_MAX}</Text>
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

        {/* 설명 */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.label}>설명</Text>
            <Text style={{ color: '#979797' }}>{(desc ?? '').length}/{DESC_MAX}</Text>
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
              value={recruitCount ?? ''}
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
            value={applyLink ?? ''}
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
          style={[styles.submitButton, { opacity: canSubmit ? 1 : 0.6 }]}
          onPress={handleSubmitEdit}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
