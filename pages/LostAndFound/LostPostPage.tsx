// pages/LostAndFound/LostPostCreatePage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import styles from './LostPostPage.styles';

// ✅ 추가: 이미지 선택/권한/액션시트 로직을 캡슐화한 훅
import useImagePicker from '../../hooks/useImagePicker';

type Purpose = 'lost' | 'found';

interface Props {
  navigation?: any; // TODO: React Navigation 타입으로 교체
}

const DRAFT_KEY = 'lost_post_draft_v1';
const POSTS_KEY = 'lost_found_posts_v1';
const MAX_PHOTOS = 10;

const LostPostPage: React.FC<Props> = ({ navigation }) => {
  /** ----------------------------------------------------------
   *  이미지 선택은 훅이 관리 (images/setImages/openAdd/removeAt)
   * ---------------------------------------------------------- */
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX_PHOTOS });

  // 나머지 폼 상태
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [place, setPlace] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // draft 저장 제어
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSaveRef = useRef(false);

  // 유효성
  const canSubmit = useMemo(
    () => Boolean(purpose && title.trim() && desc.trim() && place.trim()),
    [purpose, title, desc, place]
  );

  // 작성 중 판단(이탈 방지)
  const isDirty = useMemo(
    () =>
      images.length > 0 ||
      !!purpose ||
      !!title.trim() ||
      !!desc.trim() ||
      !!place.trim(),
    [images, purpose, title, desc, place]
  );

  // 뒤로가기
  const handleGoBack = useCallback(() => {
    if (navigation?.goBack) return navigation.goBack();
    Alert.alert('뒤로가기', '네비게이션이 연결되어 있지 않습니다.');
  }, [navigation]);

  /** =======================
   *  초안 복원
   *  ======================= */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (Array.isArray(d?.images)) setImages(d.images);
        if (d?.purpose === 'lost' || d?.purpose === 'found') setPurpose(d.purpose);
        if (typeof d?.title === 'string') setTitle(d.title);
        if (typeof d?.desc === 'string') setDesc(d.desc);
        if (typeof d?.place === 'string') setPlace(d.place);
      } catch (e) {
        console.log('draft load fail', e);
      }
    })();
  }, [setImages]);

  /** =======================
   *  초안 저장(디바운스)
   *  ======================= */
  useEffect(() => {
    if (skipSaveRef.current) return; // '나가기' 이후 저장 스킵
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const draft = { images, purpose, title, desc, place };
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.log('draft save fail', e);
      }
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [images, purpose, title, desc, place]);

  /** =======================
   *  이탈 방지 (나가기시 드래프트 스킵 & 리셋)
   *  ======================= */
  useEffect(() => {
    const sub = navigation?.addListener?.('beforeRemove', (e: any) => {
      if (!isDirty || submitting) return;
      e.preventDefault();
      Alert.alert('작성 중', '작성 중인 내용이 사라집니다. 나가시겠어요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              skipSaveRef.current = true;
              if (saveTimer.current) clearTimeout(saveTimer.current);
              await AsyncStorage.removeItem(DRAFT_KEY);
              // 메모리 리셋
              setImages([]);
              setPurpose(null);
              setTitle('');
              setDesc('');
              setPlace('');
            } finally {
              navigation.dispatch(e.data.action);
            }
          },
        },
      ]);
    });
    return () => {
      if (sub) sub();
    };
  }, [isDirty, submitting, navigation, setImages]);

  /** =======================
   *  제출: 로컬 피드에 저장(최신순)
   *  ======================= */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        type: purpose as Purpose,
        title: title.trim(),
        content: desc.trim(),
        location: place.trim(),
        photos: images, // TODO: 실제 업로드 후 URL 사용
      };

      const newItem = {
        id: String(Date.now()),
        type: payload.type, // 'lost' | 'found'
        title: payload.title,
        content: payload.content,
        location: payload.location,
        images: payload.photos,
        likeCount: 0,
        createdAt: new Date().toISOString(),
      };

      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));

      await AsyncStorage.removeItem(DRAFT_KEY);
      Alert.alert('등록 완료', '분실물 게시글이 작성되었습니다.');

      // 폼 리셋
      setImages([]);
      setPurpose(null);
      setTitle('');
      setDesc('');
      setPlace('');

      navigation?.goBack?.();
    } catch (e: any) {
      Alert.alert('오류', e?.message || '작성에 실패했어요. 잠시 후 다시 시도해주세요.');
      console.log(e);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, desc, images, navigation, place, purpose, submitting, title, setImages]);

  return (
    <View style={styles.container}>
      {/* inner: 화면 공통 여백/레이아웃을 한 곳에서 관리 */}
      <View style={styles.inner}>
        {/* ===== 헤더 ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
          >
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>분실물 센터</Text>
          </View>
        </View>

        {/* ===== 본문 ===== */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 사진 영역: UI는 PhotoPicker, 동작은 훅 */}
          <PhotoPicker
            images={images}
            max={MAX_PHOTOS}
            onAddPress={openAdd}
            onRemoveAt={removeAt}
          />

          {/* 작성 목적 (분실/습득) */}
          <View style={styles.block}>
            <Text style={styles.label}>작성 목적</Text>
            <Text style={styles.helper}>
              분실했나요, 아니면 물건을 주우셨나요? 해당하는 항목을 선택해주세요!
            </Text>

            <View style={styles.chipRow}>
              <TouchableOpacity
                onPress={() => setPurpose('lost')}
                style={[
                  styles.chip,
                  purpose === 'lost' ? styles.chipActive : styles.chipInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: purpose === 'lost' }}
              >
                <Text
                  style={[
                    styles.chipText,
                    purpose === 'lost' ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  분실
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPurpose('found')}
                style={[
                  styles.chip,
                  purpose === 'found' ? styles.chipActive : styles.chipInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: purpose === 'found' }}
              >
                <Text
                  style={[
                    styles.chipText,
                    purpose === 'found' ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  습득
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 제목 */}
          <View style={styles.block}>
            <Text style={styles.label}>제목</Text>
            <View style={styles.inputBox}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="글 제목"
                placeholderTextColor="#979797"
                style={styles.input}
                maxLength={50}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* 설명 */}
          <View style={styles.block}>
            <Text style={styles.label}>설명</Text>
            <View style={styles.textareaBox}>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder={
                  '용누리 캠퍼스에 올릴 게시글 내용을 작성해주세요.\n예시) 분실 / 습득한 장소와 대략적인 시간대, 구체적인 외형, 브랜드, 색상, 특징 등'
                }
                placeholderTextColor="#979797"
                style={styles.textarea}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>
          </View>

          {/* 장소 선택 */}
          <View style={styles.block}>
            <LocationPicker
              value={place}
              onChange={setPlace}
              placeholder="장소를 선택해 주세요."
              label="분실 / 습득 장소"
            />
          </View>

          {/* 스크롤 하단 여백 확보 (버튼 공간만큼) */}
          <View style={styles.submitSpacer} />
        </ScrollView>

        {/* ===== 하단 고정 버튼 ===== */}
        <View style={styles.submitWrap}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { opacity: canSubmit && !submitting ? 1 : 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            activeOpacity={canSubmit && !submitting ? 0.9 : 1}
          >
            <Text style={styles.submitText}>
              {submitting ? '작성 중...' : '작성 완료'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LostPostPage;
