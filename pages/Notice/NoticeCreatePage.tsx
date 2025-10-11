// pages/Admin/NoticeCreatePage.tsx

import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import DatePickerSheet from '../../components/TimePicker/DatePickerSheet';
import { useImagePicker } from '../../hooks/useImagePicker';
import type { RootStackParamList } from '../../types/navigation';
import styles from './NoticeCreatePage.styles';

// ✅ API 연결: 공지 API
import {
  createNotice,
  updateNotice,
  type CreateNoticeRequest,
  type NoticeResponse,
} from '../../api/notices';

type NoticeWriteRoute = RouteProp<RootStackParamList, 'AdminNoticeCreate' | 'NoticeWrite'>;

const MAX = 10;

export default function NoticeCreatePage() {
  const route = useRoute<NoticeWriteRoute>();
  const navigation = useNavigation<any>();

  // NoticeWrite에서만 mode/id 파라미터가 있음
  const isNoticeWrite = route.name === 'NoticeWrite';
  const mode = isNoticeWrite ? route.params?.mode ?? 'create' : 'create';
  const editId = isNoticeWrite ? route.params?.id : undefined;

  // ✅ 이미지: 현재는 로컬 미리보기/선택만. 서버 업로드는 추후 API 확정 후 연결.
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX });

  // 폼 상태
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');        // 서버에는 content로 매핑
  const [applyUrl, setApplyUrl] = useState(''); // 서버에는 link로 매핑
  const [applyDate, setApplyDate] = useState<Date | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  // ⚠️ 기존 로컬 저장소 기반의 '수정' 로드는 제거.
  // 실제 수정 화면 진입 시에는 상세 API로 불러와서 초기값 세팅하는 흐름이 일반적임.
  // 지금은 파라미터로 넘어온 값이 없으므로, 필요 시 NoticeDetail에서 route.params로 넘겨도 됨.

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

  // 공통: ISO 문자열(yyyy-MM-ddTHH:mm:ss)로 맞춰 주기
  const toIsoEndOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();

  // 등록/수정 저장 (API 연결)
  const submit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('알림', '제목과 설명을 입력해주세요.');
      return;
    }

    try {
      const start = new Date();
      const end = applyDate ?? start;

      // 서버 DTO로 매핑
      const payload: CreateNoticeRequest = {
        title: title.trim(),
        content: desc.trim(),
        isImages: images.length > 0,     // ✔ 현재는 이미지가 있는지만 서버에 전달
        link: applyUrl.trim() || undefined,
        startDate: start.toISOString(),
        endDate: toIsoEndOfDay(end),
        // status는 기본값(RECRUITING) 사용. 필요 시 드롭다운 추가하여 선택 값 전송
        // status: 'RECRUITING',
      };

      let res: NoticeResponse;

      if (mode === 'edit' && editId) {
        // PATCH
        res = await updateNotice(editId, payload);
        Alert.alert('완료', `공지 수정 완료 (#${res.id})`);
      } else {
        // POST
        res = await createNotice(payload);
        Alert.alert('완료', `공지 등록 완료 (#${res.id})`);
      }

      // 폼 초기화
      setTitle('');
      setDesc('');
      setApplyUrl('');
      setImages([]);
      setApplyDate(null);

      // 다음 화면 이동: 공지 상세로 가거나, 목록/메인으로 이동
      // ✅ 상세로 이동하는 예시:
      navigation.navigate('NoticeDetail', { id: String(res.id), isAdmin: true });

      // ✅ 지금 구조 유지: Main으로 리셋 (초기 Tab은 프로젝트 상황에 맞게)
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { initialTab: 'market' } }],
        })
      );
    } catch (e: any) {
      // 백엔드 표준 에러(message)를 우선 사용
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        '서버 통신 중 오류가 발생했습니다.';
      console.log('[NOTICE SUBMIT ERR]', e?.response?.data ?? e);
      Alert.alert('오류', msg);
    }
  }, [canSubmit, images, title, desc, applyUrl, applyDate, mode, editId, navigation]);

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
        {/* TODO: 이미지 업로드 API 스펙 확정 후, 공지 생성 성공 시
                res.id 기준 업로드 엔드포인트 호출 → 성공하면 썸네일/이미지 표시 동기화. */}

        {/* 제목 */}
        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          placeholder="글 제목"
          value={title}
          onChangeText={setTitle}
          maxLength={150} // 서버 @Size(max=150)와 맞춤
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
