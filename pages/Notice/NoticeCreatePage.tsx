import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useRoute, RouteProp, useNavigation } from '@react-navigation/native';
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

import type { RootStackParamList } from '../../types/navigation';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import DatePickerSheet from '../../components/TimePicker/DatePickerSheet';
import styles from './NoticeCreatePage.styles';
import { useImagePicker } from '../../hooks/useImagePicker';

type NoticeWriteRoute = RouteProp<RootStackParamList, 'AdminNoticeCreate' | 'NoticeWrite'>;

const NOTICE_KEY = 'notice_posts_v1';
const MAX = 10;

export default function NoticeCreatePage() {
  const route = useRoute<NoticeWriteRoute>();
  const navigation = useNavigation<any>();

  // NoticeWrite에서만 mode/id 파라미터가 있음
  const isNoticeWrite = route.name === 'NoticeWrite';
  const mode = isNoticeWrite ? route.params?.mode ?? 'create' : 'create';
  const editId = isNoticeWrite ? route.params?.id : undefined;

  // ✅ 이미지: 재사용 훅 사용 (UI는 PhotoPicker가 처리)
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX });

  // 폼 상태
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [applyDate, setApplyDate] = useState<Date | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  // 기존 수정 데이터 로드
  useEffect(() => {
    if (mode !== 'edit' || !editId) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTICE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const found = list.find((n: any) => n.id === editId);
        if (!found) return;

        setTitle(found.title ?? '');
        setDesc(found.description ?? '');
        setApplyUrl(found.applyUrl ?? '');
        setImages(Array.isArray(found.images) ? found.images : []);
        if (found.endDate) {
          setApplyDate(new Date(found.endDate));
        }
      } catch (e) {
        console.log('공지 수정 로드 오류', e);
      }
    })();
  }, [mode, editId, setImages]);

  // 날짜 유틸
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

  // 등록/수정 저장
  const submit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('알림', '제목과 설명을 입력해주세요.');
      return;
    }
    try {
      const start = new Date();
      const end = applyDate ?? start;

      const raw = await AsyncStorage.getItem(NOTICE_KEY);
      const list = raw ? JSON.parse(raw) : [];

      if (mode === 'edit' && editId) {
        // 수정
        const idx = list.findIndex((n: any) => n.id === editId);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            title: title.trim(),
            description: desc.trim(),
            images,
            endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(),
            applyUrl: applyUrl.trim() || null,
          };
        }
      } else {
        // 신규 등록
        const newItem = {
          id: `${Date.now()}`,
          title: title.trim(),
          description: desc.trim(),
          images,
          startDate: start.toISOString(),
          endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(),
          createdAt: start.toISOString(),
          applyUrl: applyUrl.trim() || null,
        };
        list.unshift(newItem);
      }

      await AsyncStorage.setItem(NOTICE_KEY, JSON.stringify(list));

      // 초기화 후 메인 탭으로 이동
      setTitle('');
      setDesc('');
      setApplyUrl('');
      setImages([]);
      setApplyDate(null);

      // ⚠️ types 기준으로 존재하는 탭으로 넘기자. (notice 탭이 없다면 market 등으로)
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { initialTab: 'market' } }],
        })
      );
    } catch (e: any) {
      console.log(e);
      Alert.alert('오류', e?.message ?? '저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
  }, [canSubmit, images, title, desc, applyUrl, applyDate, mode, editId, navigation, setImages]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/images/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'edit' ? '공지 수정' : '공지 등록'}</Text>
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
        <PhotoPicker
          images={images}
          max={MAX}
          onAddPress={openAdd}
          onRemoveAt={removeAt}
        />

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
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setDateOpen(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.dateText}>
            {applyDate ? formatKoreanDate(applyDate) : '날짜를 선택하세요'}
          </Text>
          <Image source={require('../../assets/images/down.png')} style={styles.chevronIcon} />
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

        {/* 작성/수정 완료 */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
            {mode === 'edit' ? '수정 완료' : '작성 완료'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* 날짜 선택 바텀시트 */}
      <DatePickerSheet
        visible={dateOpen}
        initial={applyDate ?? new Date()}
        minDate={minDate}
        maxDate={maxDate}
        onClose={() => setDateOpen(false)}
        onConfirm={(d) => {
          const picked = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
          setApplyDate(picked);
          setDateOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
