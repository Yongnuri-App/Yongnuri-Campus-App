// /pages/GroupBuy/GroupBuyRecruitPage.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
import { CommonActions, useRoute } from '@react-navigation/native';

import styles, { COLORS } from './GroupBuyRecruitPage.styles';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';

import {
  createGroupBuyPost,
  getGroupBuyDetail,
  updateGroupBuyPost,
  GetGroupBuyDetailRes, // ✅ 올바른 타입명
} from '../../api/groupBuy';

type RecruitMode = 'unlimited' | 'limited' | null;

interface Props {
  navigation?: any;
}

const TITLE_MAX = 50;
const DESC_MAX = 1000;

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
      const limitNum =
        (recruitMode ?? 'unlimited') === 'limited' ? Number(recruitCount) : null;

      await createGroupBuyPost({
        title: title.trim(),
        content: desc.trim(),
        imageUrls: images ?? [],
        limit: limitNum,
        link: normalizedLink,
        status: 'RECRUITING',
      });

      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'Main', params: { initialTab: 'group' } }],
        })
      );
    } catch (e: any) {
      console.log('[GroupBuy create] 실패', e?.message);
      Alert.alert('오류', e?.response?.data?.message || e?.message || '등록에 실패했어요.');
    } finally {
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
 * Edit (수정) 폼 — 서버 연동
 * =======================*/
const EditForm: React.FC<{ navigation: any; postId: string }> = ({ navigation, postId }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [recruitMode, setRecruitMode] = useState<RecruitMode>('unlimited');
  const [recruitCount, setRecruitCount] = useState<string>('');
  const [applyLink, setApplyLink] = useState('');

  const { images, setImages, openAdd, removeAt, max } = useImagePicker({ max: 10 });

  // 서버에서 상세 불러와 폼 채우기
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d: GetGroupBuyDetailRes = await getGroupBuyDetail(postId);

      setTitle(d.title ?? '');
      setDesc(d.content ?? '');
      setApplyLink(d.link ?? '');

      const limit = d.limit;
      if (limit == null) {
        setRecruitMode('unlimited');
        setRecruitCount('');
      } else {
        setRecruitMode('limited');
        setRecruitCount(String(limit));
      }

      const imgs =
        Array.isArray(d.images) && d.images.length
          ? [...d.images].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)).map(i => i.imageUrl)
          : d.thumbnailUrl
          ? [d.thumbnailUrl]
          : [];
      setImages(imgs);
    } catch (e) {
      console.log('[GroupBuy edit] detail load error', (e as any)?.response?.data || e);
      Alert.alert('오류', '게시글을 불러오지 못했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [postId, navigation, setImages]);

  useEffect(() => { load(); }, [load]);

  const isValidUrl = (s: string) => {
    try {
      const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValid = useMemo(() => {
    if (!title.trim() || !desc.trim()) return false;
    if (applyLink && !isValidUrl(applyLink.trim())) return false;
    if (recruitMode === 'limited') {
      const n = Number(recruitCount);
      if (!recruitCount || Number.isNaN(n) || n <= 0) return false;
    }
    return true;
  }, [title, desc, applyLink, recruitMode, recruitCount]);

  const normalizedLink = useMemo(() => {
    if (!applyLink?.trim()) return '';
    return /^https?:\/\//i.test(applyLink.trim())
      ? applyLink.trim()
      : `https://${applyLink.trim()}`;
  }, [applyLink]);

  const handleSubmitEdit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        content: desc.trim(),
        link: normalizedLink || undefined, // 빈 값이면 보내지 않음
        imageUrls: images ?? [],
      };
      if (recruitMode === 'limited') {
        payload.limit = Number(recruitCount);
      }
      // status 변경 UI 없음

      const res = await updateGroupBuyPost(postId, payload);
      console.log('[GroupBuy edit] patched ->', res);

      Alert.alert('완료', '게시글을 수정했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.log('[GroupBuy edit] patch error', e?.response?.data || e);
      Alert.alert('오류', e?.response?.data?.message || e?.message || '수정에 실패했어요.');
      setSubmitting(false);
    }
  };

  const submitLabel = submitting ? '수정 중...' : '수정 완료';
  const canSubmit = isValid && !submitting;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#979797' }}>불러오는 중…</Text>
      </View>
    );
  }

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
