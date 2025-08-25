// pages/LostAndFound/LostPostCreatePage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';

import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import styles from './LostPostPage.styles';
import { useImagePicker } from '../../hooks/useImagePicker';

type Purpose = 'lost' | 'found';

interface Props {
  navigation?: any; // TODO: React Navigation 타입으로 교체
}

const POSTS_KEY = 'lost_found_posts_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

const MAX_PHOTOS = 10;
const TITLE_MAX = 50;
const DESC_MAX = 1000;

// 로그인 전에도 쓰는 로컬 사용자 ID 보장
async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const userEmail = (await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY)) ?? null;
  return { userId, userEmail };
}

const LostPostPage: React.FC<Props> = ({ navigation }) => {
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

  const isDirty = useMemo(
    () =>
      images.length > 0 ||
      !!purpose ||
      !!title.trim() ||
      !!desc.trim() ||
      !!place.trim(),
    [images, purpose, title, desc, place]
  );

  const handleGoBack = useCallback(() => {
    if (navigation?.goBack) return navigation.goBack();
    Alert.alert('뒤로가기', '네비게이션이 연결되어 있지 않습니다.');
  }, [navigation]);

  useEffect(() => {
    const sub = navigation?.addListener?.('beforeRemove', (e: any) => {
      if (!isDirty || submitting) return;
      e.preventDefault();
      Alert.alert('작성 중', '작성 중인 내용이 사라집니다. 나가시겠어요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            setImages([]);
            setPurpose(null);
            setTitle('');
            setDesc('');
            setPlace('');
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return () => { if (sub) sub(); };
  }, [isDirty, submitting, navigation, setImages]);

  /** 제출: 로컬 피드에 저장(최신순) */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      // ✅ 로컬 사용자 식별자 보장
      const { userId, userEmail } = await ensureLocalIdentity();

      const newItem = {
        id: String(Date.now()),
        type: purpose as Purpose, // 'lost' | 'found'
        title: title.trim(),
        content: desc.trim(),
        location: place.trim(),
        images, // TODO: 실제 업로드 후 URL 사용
        likeCount: 0,
        createdAt: new Date().toISOString(),

        // ⭐️ 오너 판별용 필드
        authorId: userId,
        authorEmail: userEmail,
        authorName: '채희',   // 임시 표시용(선택)
        authorDept: 'AI학부', // 임시 표시용(선택)
      };

      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));

      Alert.alert('등록 완료', '분실물 게시글이 작성되었습니다.');

      // 폼 리셋
      setImages([]);
      setPurpose(null);
      setTitle('');
      setDesc('');
      setPlace('');

      // ✅ 스택 재구성: Main(목록-분실물) + LostDetail(방금 글)
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
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, desc, images, navigation, place, purpose, submitting, title, setImages]);

  return (
    <View style={styles.container}>
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
          {/* 사진 */}
          <PhotoPicker
            images={images}
            max={MAX_PHOTOS}
            onAddPress={openAdd}
            onRemoveAt={removeAt}
          />

          {/* 작성 목적 */}
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.label}>제목</Text>
              <Text style={{ color: '#979797' }}>{title.length}/{TITLE_MAX}</Text>
            </View>
            <View style={styles.inputBox}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="글 제목"
                placeholderTextColor="#979797"
                style={styles.input}
                maxLength={TITLE_MAX}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* 설명 */}
          <View style={styles.block}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.label}>설명</Text>
              <Text style={{ color: '#979797' }}>{desc.length}/{DESC_MAX}</Text>
            </View>
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
                maxLength={DESC_MAX}
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
