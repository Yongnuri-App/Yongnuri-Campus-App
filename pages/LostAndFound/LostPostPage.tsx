// pages/LostAndFound/LostPostCreatePage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CommonActions, useRoute } from '@react-navigation/native';

import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import styles from './LostPostPage.styles';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useEditPost, EditAdapters, DefaultGroupBuyForm } from '../../hooks/useEditPost';

type Purpose = 'lost' | 'found';
interface Props { navigation?: any; }

const POSTS_KEY = 'lost_found_posts_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';
const MAX_PHOTOS = 10;
const TITLE_MAX = 50;
const DESC_MAX = 1000;

// 로그인 전 로컬 사용자 ID 보장
async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const userEmail = (await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY)) ?? null;
  return { userId, userEmail };
}

/** ===== 분실물 Post 타입 (저장 구조) ===== */
type LostPost = {
  id: string;
  type: Purpose;
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string;
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;
};

/** ===== 어댑터: LostPost ↔ DefaultGroupBuyForm =====
 * - applyLink/recruit 미사용
 * - extra에 { purpose, place } 저장
 */
const lostAdapters: EditAdapters<LostPost, DefaultGroupBuyForm> = {
  deserialize: (post) => ({
    title: post.title ?? '',
    desc: post.content ?? '',
    mode: 'unlimited',   // 사용 안 함
    count: '',
    applyLink: '',       // 사용 안 함
    imagesText: (post.images ?? []).join(', '),
    extra: {
      purpose: post.type,
      place: post.location ?? '',
    },
  }),
  serialize: (prev, form) => ({
    ...prev,
    title: form.title.trim(),
    content: form.desc.trim(),
    location: form.extra?.place ?? prev.location,
    type: (form.extra?.purpose as Purpose) ?? prev.type,
    images: form.imagesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  }),
  validate: (form) => {
    if (!form.title.trim()) return false;
    if (!form.desc.trim()) return false;
    const place = form.extra?.place as string;
    const purpose = form.extra?.purpose as Purpose | undefined;
    if (!place?.trim()) return false;
    if (purpose !== 'lost' && purpose !== 'found') return false;
    return true;
  },
};

const LostPostPage: React.FC<Props> = ({ navigation }) => {
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

export default LostPostPage;

/* ===== 작성 폼 ===== */
const CreateForm: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX_PHOTOS });

  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [place, setPlace] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(purpose && title.trim() && desc.trim() && place.trim()),
    [purpose, title, desc, place]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const { userId, userEmail } = await ensureLocalIdentity();
      const newItem: LostPost = {
        id: String(Date.now()),
        type: purpose as Purpose,
        title: title.trim(),
        content: desc.trim(),
        location: place.trim(),
        images,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        authorId: userId,
        authorEmail: userEmail,
        authorName: '채희',
        authorDept: 'AI학부',
      };
      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list: LostPost[] = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));

      Alert.alert('등록 완료', '분실물 게시글이 작성되었습니다.');

      setImages([]); setPurpose(null); setTitle(''); setDesc(''); setPlace('');

      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Main', params: { initialTab: 'lost' } },
            { name: 'LostDetail', params: { id: newItem.id, isOwner: true } },
          ],
        })
      );
    } catch (e: any) {
      Alert.alert('오류', e?.message || '작성에 실패했어요. 잠시 후 다시 시도해주세요.');
      console.log(e);
    } finally { setSubmitting(false); }
  }, [canSubmit, desc, images, navigation, place, purpose, setImages, submitting, title]);

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Header navigation={navigation} title="분실물 센터" />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <PhotoPicker images={images} max={MAX_PHOTOS} onAddPress={openAdd} onRemoveAt={removeAt} />
          <PurposeChips purpose={purpose} setPurpose={(p)=>setPurpose(p)} />
          <TitleField title={title} setTitle={setTitle} />
          <DescField desc={desc} setDesc={setDesc} />
          <PlaceField place={place} setPlace={setPlace} />
          <View style={styles.submitSpacer} />
        </ScrollView>
        <SubmitBar canSubmit={canSubmit && !submitting} label={submitting ? '작성 중...' : '작성 완료'} onPress={handleSubmit} />
      </View>
    </View>
  );
};

/* ===== 수정 폼 (같은 훅 + 어댑터) ===== */
const EditForm: React.FC<{ navigation: any; postId: string }> = ({ navigation, postId }) => {
  const [submitting, setSubmitting] = useState(false);
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX_PHOTOS });

  const {
    title, setTitle,
    desc, setDesc,
    extra, setExtra,
    setImagesText,          // ✅ 이것만 필요
    isValid, save,
  } = useEditPost<LostPost, DefaultGroupBuyForm>({
    postId,
    postsKey: POSTS_KEY,
    adapters: lostAdapters,
    onLoaded: (post) => { if (post.images?.length) setImages(post.images); },
  });

  // images 동기화
  React.useEffect(() => { setImagesText(images.join(', ')); }, [images, setImagesText]);

  const canSubmit = !!isValid && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const ok = await save?.({ images, extra: { purpose: extra?.purpose, place: extra?.place } });
      if (ok) {
        Alert.alert('완료', '게시글을 수정했어요.', [{ text: '확인', onPress: () => navigation.goBack() }]);
      } else {
        setSubmitting(false);
      }
    } catch (e: any) {
      Alert.alert('오류', e?.message || '수정에 실패했어요.');
      console.log(e);
      setSubmitting(false);
    }
  }, [canSubmit, extra?.place, extra?.purpose, images, navigation, save]);

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Header navigation={navigation} title="분실물 수정" />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <PhotoPicker images={images} max={MAX_PHOTOS} onAddPress={openAdd} onRemoveAt={removeAt} />
          <PurposeChips purpose={extra?.purpose ?? null} setPurpose={(p)=>setExtra({ purpose: p })} />
          <TitleField title={title} setTitle={setTitle} />
          <DescField desc={desc} setDesc={setDesc} />
          <PlaceField place={extra?.place ?? ''} setPlace={(v)=>setExtra({ place: v })} />
          <View style={styles.submitSpacer} />
        </ScrollView>
        <SubmitBar canSubmit={canSubmit} label={submitting ? '수정 중...' : '수정 완료'} onPress={handleSubmit} />
      </View>
    </View>
  );
};

/* ===== 재사용 UI ===== */
const Header: React.FC<{ navigation: any; title: string }> = ({ navigation, title }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={() => (navigation?.goBack ? navigation.goBack() : Alert.alert('뒤로가기 불가'))} style={styles.backButton} accessibilityRole="button" accessibilityLabel="뒤로가기">
      <Image source={require('../../assets/images/back.png')} style={styles.backIcon} resizeMode="contain" />
    </TouchableOpacity>
    <View style={styles.headerTitleWrap}><Text style={styles.headerTitle}>{title}</Text></View>
  </View>
);

const PurposeChips: React.FC<{ purpose: Purpose | null; setPurpose: (p: Purpose)=>void; }> = ({ purpose, setPurpose }) => (
  <View style={styles.block}>
    <Text style={styles.label}>작성 목적</Text>
    <Text style={styles.helper}>분실했나요, 아니면 물건을 주우셨나요? 해당하는 항목을 선택해주세요!</Text>
    <View style={styles.chipRow}>
      <TouchableOpacity onPress={() => setPurpose('lost')} style={[styles.chip, purpose === 'lost' ? styles.chipActive : styles.chipInactive]} accessibilityRole="button" accessibilityState={{ selected: purpose === 'lost' }}>
        <Text style={[styles.chipText, purpose === 'lost' ? styles.chipTextActive : styles.chipTextInactive]}>분실</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setPurpose('found')} style={[styles.chip, purpose === 'found' ? styles.chipActive : styles.chipInactive]} accessibilityRole="button" accessibilityState={{ selected: purpose === 'found' }}>
        <Text style={[styles.chipText, purpose === 'found' ? styles.chipTextActive : styles.chipTextInactive]}>습득</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const TitleField: React.FC<{ title: string; setTitle: (s: string)=>void; }> = ({ title, setTitle }) => (
  <View style={styles.block}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={styles.label}>제목</Text>
      <Text style={{ color: '#979797' }}>{title.length}/{TITLE_MAX}</Text>
    </View>
    <View style={styles.inputBox}>
      <TextInput value={title} onChangeText={setTitle} placeholder="글 제목" placeholderTextColor="#979797" style={styles.input} maxLength={TITLE_MAX} returnKeyType="next" />
    </View>
  </View>
);

const DescField: React.FC<{ desc: string; setDesc: (s: string)=>void; }> = ({ desc, setDesc }) => (
  <View style={styles.block}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={styles.label}>설명</Text>
      <Text style={{ color: '#979797' }}>{desc.length}/{DESC_MAX}</Text>
    </View>
    <View style={styles.textareaBox}>
      <TextInput
        value={desc}
        onChangeText={setDesc}
        placeholder={'용누리 캠퍼스에 올릴 게시글 내용을 작성해주세요.\n예시) 분실 / 습득한 장소와 대략적인 시간대, 구체적인 외형, 브랜드, 색상, 특징 등'}
        placeholderTextColor="#979797"
        style={styles.textarea}
        multiline textAlignVertical="top" maxLength={DESC_MAX}
      />
    </View>
  </View>
);

const PlaceField: React.FC<{ place: string; setPlace: (s: string)=>void; }> = ({ place, setPlace }) => (
  <View style={styles.block}>
    <LocationPicker value={place} onChange={setPlace} placeholder="장소를 선택해 주세요." label="분실 / 습득 장소" />
  </View>
);

const SubmitBar: React.FC<{ canSubmit: boolean; label: string; onPress: () => void; }> = ({ canSubmit, label, onPress }) => (
  <View style={styles.submitWrap}>
    <TouchableOpacity style={[styles.submitButton, { opacity: canSubmit ? 1 : 0.6 }]} onPress={onPress} disabled={!canSubmit} activeOpacity={canSubmit ? 0.9 : 1}>
      <Text style={styles.submitText}>{label}</Text>
    </TouchableOpacity>
  </View>
);
