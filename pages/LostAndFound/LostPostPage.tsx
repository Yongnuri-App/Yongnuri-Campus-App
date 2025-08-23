// pages/LostAndFound/LostPostCreatePage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// (선택) 압축 원하면 사용
// import * as ImageManipulator from 'expo-image-manipulator';

import styles from './LostPostPage.styles';
import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';

type Purpose = 'lost' | 'found';

interface Props {
  navigation?: any; // TODO: React Navigation 타입으로 교체
}

const DRAFT_KEY = 'lost_post_draft_v1';
const POSTS_KEY = 'lost_found_posts_v1';
const MAX_PHOTOS = 10;

const LostPostPage: React.FC<Props> = ({ navigation }) => {
  // 상태
  const [images, setImages] = useState<string[]>([]);
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

  // ===== 사진 추가 =====
  const handleAddPhoto = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert('알림', `사진은 최대 ${MAX_PHOTOS}장까지 업로드할 수 있어요.`);
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['사진 보관함에서 선택', '파일에서 선택', '취소'],
          cancelButtonIndex: 2,
        },
        async (idx) => {
          if (idx === 0) await pickFromPhotos();
          else if (idx === 1) await pickFromFiles();
        }
      );
    } else {
      Alert.alert('사진 추가', '추가 방법을 선택해주세요.', [
        { text: '사진 보관함', onPress: () => pickFromPhotos() },
        { text: '파일', onPress: () => pickFromFiles() },
        { text: '취소', style: 'cancel' },
      ]);
    }
  };

  const pickFromPhotos = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진 보관함 접근 권한을 허용해주세요.');
        return;
      }
      const remain = MAX_PHOTOS - images.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled) return;
      const assetUris = (result.assets ?? []).map((a) => a.uri);
      const toAdd = assetUris.slice(0, remain);

      // (선택) 압축 처리 가능
      setImages((prev) => [...prev, ...toAdd]);
    } catch (e) {
      console.log('pickFromPhotos error', e);
      Alert.alert('오류', '사진을 불러오지 못했어요.');
    }
  };

  const pickFromFiles = async () => {
    try {
      const remain = MAX_PHOTOS - images.length;
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if ((res as any).canceled) return;

      const assets = (res as any).assets ?? [];
      if (!assets.length) return;

      const chosen: string[] = [];
      for (const a of assets) {
        const uri: string | undefined = a.uri;
        const mime: string | undefined =
          a.mimeType || (Array.isArray(a.mimeType) ? a.mimeType[0] : undefined);
        if (!uri) continue;
        if (mime && !String(mime).startsWith('image/')) {
          Alert.alert('알림', '이미지 파일만 업로드할 수 있어요.');
          continue;
        }
        chosen.push(uri);
      }
      const toAdd = chosen.slice(0, remain);
      if (toAdd.length) setImages((prev) => [...prev, ...toAdd]);
    } catch (e) {
      console.log('pickFromFiles error', e);
      Alert.alert('오류', '파일을 불러오지 못했어요.');
    }
  };

  // ===== 초안 복원 =====
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
  }, []);

  // ===== 초안 저장(디바운스) =====
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

  // ===== 이탈 방지 (나가기시 드래프트 스킵 & 리셋) =====
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
  }, [isDirty, submitting, navigation]);

  // ===== 제출: 로컬 피드에 저장(최신순) =====
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        type: purpose as Purpose,
        title: title.trim(),
        content: desc.trim(),
        location: place.trim(),
        photos: images, // TODO: 추후 업로드 후 URL 사용
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
  }, [canSubmit, desc, images, navigation, place, purpose, submitting, title]);

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
          {/* 사진 영역 */}
          <PhotoPicker
            images={images}
            max={MAX_PHOTOS}
            onAddPress={handleAddPhoto}
            onRemoveAt={(index) =>
              setImages((prev) => prev.filter((_, i) => i !== index))
            }
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
