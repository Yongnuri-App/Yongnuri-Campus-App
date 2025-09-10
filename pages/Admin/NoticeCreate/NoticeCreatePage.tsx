// pages/Admin/NoticeCreate/NoticeCreatePage.tsx
import React, { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackScreenProps } from '../../../types/navigation';
import PhotoPicker from '../../../components/PhotoPicker/PhotoPicker';
import DatePickerSheet from '../../../components/TimePicker/DatePickerSheet';
import styles from './NoticeCreatePage.styles';

type Props = RootStackScreenProps<'AdminNoticeCreate'>;

export default function NoticeCreatePage({ navigation }: Props) {
  // 이미지 (PhotoPicker 사용)
  const [images, setImages] = useState<string[]>([]);
  const max = 10;

  const openAdd = useCallback(async () => {
    if (images.length >= max) {
      Alert.alert('알림', '이미지는 최대 10장까지 등록할 수 있어요.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImages(prev => [...prev, res.assets[0].uri].slice(0, max));
    }
  }, [images.length]);

  const removeAt = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 폼 상태
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [applyUrl, setApplyUrl] = useState('');

  // 날짜 (DatePickerSheet 사용)
  const [applyDate, setApplyDate] = useState<Date | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const minDate = useMemo(() => new Date(now.getFullYear() - 50, 0, 1), [now]);
  const maxDate = useMemo(() => new Date(now.getFullYear() + 50, 11, 31), [now]);

  const formatKoreanDate = (d: Date) => {
    const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`;
  };

  const canSubmit = useMemo(
    () => title.trim().length > 0 && desc.trim().length > 0,
    [title, desc]
  );

  const NOTICE_KEY = 'notice_posts_v1';

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert('알림', '제목과 설명을 입력해주세요.');
      return;
    }
    try {
      // 시작 날짜 = 작성 시각(지금)
      const start = new Date();
      // 마감일은 선택한 날짜 (없으면 시작일과 동일하게 저장)
      const end = applyDate ?? start;

      const newItem = {
        id: `${Date.now()}`,
        title: title.trim(),
        description: desc.trim(),
        images,
        startDate: start.toISOString(),
        endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(), // 하루 끝
        createdAt: start.toISOString(),
        applyUrl: applyUrl.trim() || null,
      };

      const raw = await AsyncStorage.getItem(NOTICE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(NOTICE_KEY, JSON.stringify(list));

      // 초기화 & 메인 공지 탭으로 이동
      setTitle('');
      setDesc('');
      setApplyUrl('');
      setImages([]);
      setApplyDate(null);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { initialTab: 'notice' } }],
        })
      );
    } catch (e: any) {
      console.log(e);
      Alert.alert('오류', e?.message ?? '저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Image
            source={require('../../../assets/images/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공지사항 등록</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 사진 */}
        <Text style={styles.label}>사진</Text>
        <PhotoPicker images={images} max={max} onAddPress={openAdd} onRemoveAt={removeAt} />

        {/* 제목 */}
        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          placeholder="글 제목"
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

        {/* 설명 */}
        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="용누리 캠퍼스에 올릴 게시글 내용을 작성해주세요."
          value={desc}
          onChangeText={setDesc}
          multiline
          textAlignVertical="top"
        />

        {/* 신청 기간 */}
        <Text style={styles.label}>신청 기간</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setDateOpen(true)} activeOpacity={0.9}>
          <Text style={styles.dateText}>
            {applyDate ? formatKoreanDate(applyDate) : '날짜를 선택하세요'}
          </Text>
          <Image
            source={require('../../../assets/images/down.png')}
            style={styles.chevronIcon}
          />
        </TouchableOpacity>

        {/* 모집 신청 링크 */}
        <Text style={styles.label}>모집 신청 링크</Text>
        <TextInput
          style={styles.input}
          placeholder="신청서를 받을 링크 주소를 입력해주세요."
          value={applyUrl}
          onChangeText={setApplyUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {/* 작성 완료 */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>작성 완료</Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ===== 날짜 선택 바텀시트 (공용 컴포넌트) ===== */}
      <DatePickerSheet
        visible={dateOpen}
        initial={applyDate ?? new Date()}
        minDate={minDate}
        maxDate={maxDate}
        onClose={() => setDateOpen(false)}
        onConfirm={(d) => {
          // 정오로 고정(타임존 영향 최소화)
          const picked = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
          setApplyDate(picked);
          setDateOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
