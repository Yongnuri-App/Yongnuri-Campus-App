// pages/LostAndFound/LostPostPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions, useRoute } from '@react-navigation/native';

import styles from './LostPostPage.styles';
import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';

// ✅ 칩과 동일한 라벨/아이디 매핑을 재사용
import { DEFAULT_CATEGORIES } from '../../components/CategoryChips/CategoryChips';

import { getCurrentUserEmail } from '../../utils/currentUser';
import {
  createLostFoundPost,
  updateLostFoundPost,
  getLostFoundDetail,
} from '../../api/lost';

// ===== 상수 =====
const POSTS_KEY = 'lost_found_posts_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const MAX_PHOTOS = 10;
const TITLE_MAX = 50;
const DESC_MAX = 1000;

// 로그인 전 로컬 사용자 ID 보장 (채팅/소유권 폴백용)
async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  return { userId };
}

// ✅ id 또는 label이 들어와도 label로 표준화
function normalizeLocationLabel(input: string): string {
  const v = (input ?? '').trim();
  if (!v) return '';
  const hit = DEFAULT_CATEGORIES.find(c => c.id === v || c.label === v);
  return hit ? hit.label : v; // 일치 항목이 없으면 원문 사용(백엔드가 그대로 보존)
}

type Purpose = 'lost' | 'found';

const LostPostPage: React.FC<{ navigation?: any }> = ({ navigation }) => {
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

/* ===========================
 *        작성(POST)
 * =========================== */
const CreateForm: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX_PHOTOS });

  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [place, setPlace] = useState(''); // <- LocationPicker가 id 또는 label을 줄 수 있음
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(purpose && title.trim() && desc.trim() && place.trim()),
    [purpose, title, desc, place]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await ensureLocalIdentity();
      const email = await getCurrentUserEmail();
      if (!email) {
        Alert.alert('오류', '로그인이 필요합니다.');
        setSubmitting(false);
        return;
      }

      // ✅ 저장 전에 위치를 label로 표준화
      const locationLabel = normalizeLocationLabel(place);

      const payload = {
        title: title.trim(),
        purpose: (purpose === 'lost' ? 'LOST' : 'FOUND') as 'LOST' | 'FOUND',
        content: desc.trim(),
        imageUrls: images,
        location: locationLabel,
        status: 'REPORTED',
      };

      const res = await createLostFoundPost(payload);

      Alert.alert('등록 완료', '분실물 게시글이 작성되었습니다.');
      // 폼 초기화
      setImages([]); setPurpose(null); setTitle(''); setDesc(''); setPlace('');

      // 메인 → 상세로 이동
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Main', params: { initialTab: 'lost' } },
            { name: 'LostDetail', params: { id: String(res.postId) } },
          ],
        })
      );
    } catch (err: any) {
      console.log('[LostCreate] error', err?.response?.data || err?.message);
      Alert.alert('오류', err?.response?.data?.message || '작성 실패');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, desc, images, navigation, place, purpose, setImages, submitting, title]);

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Header navigation={navigation} title="분실물 작성" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <PhotoPicker images={images} max={MAX_PHOTOS} onAddPress={openAdd} onRemoveAt={removeAt} />
          <PurposeChips purpose={purpose} setPurpose={setPurpose} />
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

/* ===========================
 *        수정(PATCH)
 * =========================== */
const EditForm: React.FC<{ navigation: any; postId: string }> = ({ navigation, postId }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 폼 상태
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [place, setPlace] = useState('');
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX_PHOTOS });

  // 상세 불러와서 프리필 (서버 실패 시 로컬 폴백)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      console.log('[LostEdit] mount, postId =', postId);
      try {
        const d = await getLostFoundDetail(postId);
        console.log('[LostEdit] detail ok', d);
        if (!mounted) return;

        setPurpose(d.purpose === 'LOST' ? 'lost' : 'found');
        setTitle(d.title ?? '');
        setDesc(d.content ?? '');
        // ✅ 서버에는 label이 저장되어 있으므로 그대로 세팅 (LocationPicker가 id 기반이면 내부에서 처리)
        setPlace(d.location ?? '');
        setImages((d.images ?? []).map(it => it.imageUrl).filter(Boolean));
      } catch (err: any) {
        console.log('[LostEdit] detail failed, fallback → local', err?.response?.data || err?.message);
        try {
          const raw = await AsyncStorage.getItem(POSTS_KEY);
          const list: any[] = raw ? JSON.parse(raw) : [];
          const found = list.find(p => String(p?.id) === String(postId));
          if (found) {
            setPurpose(found.type === 'lost' ? 'lost' : 'found');
            setTitle(found.title ?? '');
            setDesc(found.content ?? '');
            setPlace(found.location ?? '');
            setImages(Array.isArray(found.images) ? found.images : []);
          } else {
            Alert.alert('안내', '게시글을 찾을 수 없어요.', [
              { text: '확인', onPress: () => navigation.goBack() },
            ]);
          }
        } catch (e) {
          console.log('[LostEdit] local fallback error', e);
          Alert.alert('오류', '게시글을 불러오지 못했어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [postId, navigation, setImages]);

  const canSubmit = Boolean(purpose && title.trim() && desc.trim() && place.trim()) && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // ✅ 수정 시에도 label로 표준화 후 전송
      const locationLabel = normalizeLocationLabel(place);

      const payload = {
        title: title.trim(),
        content: desc.trim(),
        purpose: (purpose === 'lost' ? 'LOST' : 'FOUND') as 'LOST' | 'FOUND',
        location: locationLabel,
        imageUrls: images,
      };
      await updateLostFoundPost(postId, payload);

      Alert.alert('완료', '게시글을 수정했습니다.', [
        {
          text: '확인',
          onPress: () =>
            navigation.reset({
              index: 1,
              routes: [
                { name: 'Main', params: { initialTab: 'lost' } },
                { name: 'LostDetail', params: { id: String(postId) } },
              ],
            }),
        },
      ]);
    } catch (err: any) {
      console.log('[LostEdit] patch error', err?.response?.data || err?.message);
      Alert.alert('오류', err?.response?.data?.message || '수정 실패');
      setSubmitting(false);
    }
  }, [canSubmit, desc, images, navigation, place, postId, purpose, title]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Header navigation={navigation} title="분실물 수정" />
          <View style={{ padding: 24 }}>
            <Text>불러오는 중...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Header navigation={navigation} title="분실물 수정" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <PhotoPicker images={images} max={MAX_PHOTOS} onAddPress={openAdd} onRemoveAt={removeAt} />
          <PurposeChips purpose={purpose} setPurpose={setPurpose} />
          <TitleField title={title} setTitle={setTitle} />
          <DescField desc={desc} setDesc={setDesc} />
          <PlaceField place={place} setPlace={setPlace} />
          <View style={styles.submitSpacer} />
        </ScrollView>
        <SubmitBar canSubmit={canSubmit} label={submitting ? '수정 중...' : '수정 완료'} onPress={handleSubmit} />
      </View>
    </View>
  );
};

/* ===========================
 *        재사용 UI
 * =========================== */
const Header: React.FC<{ navigation: any; title: string }> = ({ navigation, title }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
      <Image source={require('../../assets/images/back.png')} style={styles.backIcon} resizeMode="contain" />
    </TouchableOpacity>
    <View style={styles.headerTitleWrap}><Text style={styles.headerTitle}>{title}</Text></View>
  </View>
);

const PurposeChips: React.FC<{ purpose: Purpose | null; setPurpose: (p: Purpose) => void; }> = ({ purpose, setPurpose }) => (
  <View style={styles.block}>
    <Text style={styles.label}>작성 목적</Text>
    <Text style={styles.helper}>분실했나요, 아니면 물건을 주우셨나요?</Text>
    <View style={styles.chipRow}>
      <TouchableOpacity
        onPress={() => setPurpose('lost')}
        style={[styles.chip, purpose === 'lost' ? styles.chipActive : styles.chipInactive]}
        activeOpacity={0.85}
      >
        <Text style={[styles.chipText, purpose === 'lost' ? styles.chipTextActive : styles.chipTextInactive]}>분실</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setPurpose('found')}
        style={[styles.chip, purpose === 'found' ? styles.chipActive : styles.chipInactive]}
        activeOpacity={0.85}
      >
        <Text style={[styles.chipText, purpose === 'found' ? styles.chipTextActive : styles.chipTextInactive]}>습득</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const TitleField: React.FC<{ title: string; setTitle: (s: string) => void }> = ({ title, setTitle }) => (
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

const DescField: React.FC<{ desc: string; setDesc: (s: string) => void }> = ({ desc, setDesc }) => (
  <View style={styles.block}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={styles.label}>설명</Text>
      <Text style={{ color: '#979797' }}>{desc.length}/{DESC_MAX}</Text>
    </View>
    <View style={styles.textareaBox}>
      <TextInput
        value={desc}
        onChangeText={setDesc}
        placeholder="분실/습득 상황을 자세히 작성해주세요"
        placeholderTextColor="#979797"
        style={styles.textarea}
        multiline
        textAlignVertical="top"
        maxLength={DESC_MAX}
      />
    </View>
  </View>
);

const PlaceField: React.FC<{ place: string; setPlace: (s: string) => void }> = ({ place, setPlace }) => (
  <View style={styles.block}>
    <LocationPicker value={place} onChange={setPlace} placeholder="장소를 선택해 주세요." label="분실 / 습득 장소" />
  </View>
);

const SubmitBar: React.FC<{ canSubmit: boolean; label: string; onPress: () => void; }> = ({ canSubmit, label, onPress }) => (
  <View style={styles.submitWrap}>
    <TouchableOpacity
      style={[styles.submitButton, { opacity: canSubmit ? 1 : 0.6 }]}
      activeOpacity={canSubmit ? 0.9 : 1}
      onPress={onPress}
      disabled={!canSubmit}
    >
      <Text style={styles.submitText}>{label}</Text>
    </TouchableOpacity>
  </View>
);
