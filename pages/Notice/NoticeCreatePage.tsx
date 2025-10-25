// pages/Admin/NoticeCreatePage.tsx
/**
 * 관리자 공지 등록/수정 페이지
 * - 수정 모드: 서버 상세 → AsyncStorage 캐시 저장 완료 후에만 useEditPost 활성화
 *   (enabled를 cacheReady로 제어해서 "게시글을 찾을 수 없어요" 레이스 방지)
 * - 이미지: 서버가 상대경로(/uploads/...)를 주므로
 *   · 화면 표시용: 절대경로(http://IP:PORT/uploads/...)로 보정
 *   · 저장 전송용: 상대경로(/uploads/...)로 되돌려 payload.imageUrls에 넣기
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useEditPost, type DefaultGroupBuyForm } from '../../hooks/useEditPost';
import { useImagePicker } from '../../hooks/useImagePicker';
import type { RootStackParamList } from '../../types/navigation';
import styles from './NoticeCreatePage.styles';

import { uploadImages } from '../../api/images';
import {
  createNotice,
  getNoticeDetail,
  updateNotice,
  type CreateNoticeRequest,
  type NoticeResponse,
} from '../../api/notices';

import Constants from 'expo-constants';

type NoticeWriteRoute = RouteProp<
  RootStackParamList,
  'AdminNoticeCreate' | 'NoticeWrite'
>;

const MAX = 10;
// 캐시 키는 다른 화면과 충돌하지 않게 구분자 포함
const EDIT_CACHE_KEY = 'notice_edit_cache_v1';

/** ------------------------------------------------------------------
 *  API BASE URL
 *  - app.json(expo) 의 extra.apiBaseUrl 을 우선 사용
 *  - 없으면 안전하게 fallback (개발 중 로컬 IP/PORT로 교체)
 * ------------------------------------------------------------------*/
const API_BASE =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ||
  (Constants.manifest?.extra as any)?.apiBaseUrl ||
  'http://192.168.0.7:8080'; // TODO: 환경에 맞게 수정

/** 상대(/uploads/xxx) → 절대(http://IP:PORT/uploads/xxx) */
const toAbsoluteUrl = (url: string) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url; // 이미 절대경로
  const base = API_BASE.replace(/\/+$/, '');
  const path = url.replace(/^\/+/, '');
  return `${base}/${path}`;
};

/** 절대(http://IP:PORT/uploads/xxx) → 상대(/uploads/xxx)
 *  - 서버가 상대경로를 기대할 때 payload 전송 전에 사용
 */
const toRelativePath = (url: string) => {
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) return url; // 이미 상대경로
  try {
    const u = new URL(url);
    return u.pathname.startsWith('/') ? u.pathname : `/${u.pathname}`;
  } catch {
    return url;
  }
};

// ✅ 로컬/원격 판단: 이미 서버 URL이면 업로드 생략
const isRemote = (u: string) =>
  /^https?:\/\//i.test(u) || u.startsWith('/uploads/');

// 로컬 LocalDateTime 포맷
function toLocalDateTimeString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${da}T${h}:${mi}:${s}`;
}

/** NoticeResponse -> DefaultGroupBuyForm
 *  - 백엔드 이미지가 상대경로이므로, 화면에서 바로 쓰도록 절대경로로 변환
 */
function deserializeNoticeToForm(n: NoticeResponse): DefaultGroupBuyForm {
  const images = Array.isArray(n.images)
    ? n.images
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((i) => toAbsoluteUrl(i.imageUrl)) // ★ 핵심: 절대경로로 변환
    : [];

  const extra = {
    startDate: n.startDate ?? null,
    endDate: n.endDate ?? null,
    createdAt: n.createdAt ?? null,
    status: n.status ?? 'RECRUITING',
  };
  return {
    title: n.title ?? '',
    desc: n.content ?? '',
    mode: 'unlimited', // 훅 기본 모델 호환용
    count: '',
    applyLink: n.link ?? '',
    imagesText: images.join(', '), // PhotoPicker가 바로 쓸 수 있는 CSV 문자열
    extra,
  };
}

export default function NoticeCreatePage() {
  const route = useRoute<NoticeWriteRoute>();
  const navigation = useNavigation<any>();

  const isNoticeWrite = route.name === 'NoticeWrite';
  const mode: 'create' | 'edit' = isNoticeWrite
    ? route.params?.mode ?? 'create'
    : 'create';
  const editId = isNoticeWrite ? route.params?.id : undefined;

  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX });

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [applyDate, setApplyDate] = useState<Date | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ 레이스 해결용: 캐시 저장 완료 여부
  const [cacheReady, setCacheReady] = useState(false);

  // 날짜 유틸
  const now = useMemo(() => new Date(), []);
  const minDate = useMemo(
    () => new Date(now.getFullYear() - 50, 0, 1),
    [now]
  );
  const maxDate = useMemo(
    () => new Date(now.getFullYear() + 50, 11, 31),
    [now]
  );

  const formatKoreanDate = (d: Date) => {
    const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`;
  };

  const canSubmit = useMemo(
    () => title.trim().length > 0 && desc.trim().length > 0,
    [title, desc]
  );

  /**
   * =========================
   *  수정 모드: 서버 상세 → 캐시 저장
   * =========================
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mode !== 'edit' || !editId) {
        // 생성 모드면 캐시 필요 없음
        setCacheReady(false);
        return;
      }
      try {
        setCacheReady(false);
        const detail = await getNoticeDetail(editId);
        if (!mounted) return;

        // useEditPost는 리스트에서 id로 찾으므로 배열 형태로 저장
        const list = [{ ...detail, id: detail.id }];
        await AsyncStorage.setItem(EDIT_CACHE_KEY, JSON.stringify(list));

        // ✅ 이제 준비 완료 → 훅 enabled=true 로 전환
        setCacheReady(true);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          '공지 정보를 불러오지 못했어요.';
        Alert.alert('오류', msg, [{ text: '확인', onPress: () => navigation.goBack() }]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mode, editId, navigation]);

  /**
   * useEditPost: 캐시가 준비된 뒤에만 활성화(enabled=cacheReady)
   * - 이렇게 해야 "게시글을 찾을 수 없어요" 알럿을 피한다.
   */
  useEditPost<NoticeResponse, DefaultGroupBuyForm>({
    postId: String(editId ?? ''),
    postsKey: EDIT_CACHE_KEY,
    enabled: cacheReady, // ✅ 핵심
    adapters: {
      deserialize: deserializeNoticeToForm,
      serialize: (prev, form) => prev, // 이 화면에선 사용 안 함
      validate: (form) => !!form.title?.trim() && !!form.desc?.trim(),
    },
    onLoaded: (post) => {
      // 폼 변환 후 로컬 필드 일괄 주입
      const f = deserializeNoticeToForm(post);

      setTitle(f.title ?? '');
      setDesc(f.desc ?? '');
      setApplyUrl(f.applyLink ?? '');

      const endIso = (f.extra as any)?.endDate as
        | string
        | null
        | undefined;
      if (endIso) {
        const d = new Date(endIso);
        if (!isNaN(d.getTime())) setApplyDate(d);
      }

      // CSV → 배열, 혹시 상대가 들어오면 절대로 보정
      const imgs = (f.imagesText || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((u) => toAbsoluteUrl(u)); // ★ 안전망

      setImages(imgs); // PhotoPicker는 http 절대 URL을 그대로 표시
    },
  });

  // 등록/수정 저장 (API 연결)
  const submit = useCallback(async () => {
    if (!canSubmit || submitting) {
      if (!canSubmit) Alert.alert('알림', '제목과 설명을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);

      /** ------------------------------------------------------
       * (A) 이미지 처리
       *  - 화면(images)에는
       *     · 신규: file://...
       *     · 기존: http(s)://IP:PORT/uploads/...
       *  - 업로드 대상: 신규(localUris)
       *  - 그대로 유지: 기존(remoteUris) → 서버가 상대경로 기대시 되돌리기
       * -----------------------------------------------------*/
      const localUris = images.filter((u) => !isRemote(u));
      const remoteUris = images.filter((u) => isRemote(u));

      // ★ 절대 → 상대로 정규화 (서버가 /uploads/... 형식을 기대한다면 필요)
      const normalizedRemoteUris = remoteUris.map(toRelativePath);

      let uploadedUrls: string[] = [];
      if (localUris.length > 0) {
        try {
          uploadedUrls = await uploadImages(localUris); // ← /api/images.ts 사용 (상대경로 배열 반환 가정)
        } catch (err: any) {
          console.log(
            '[IMAGE UPLOAD ERR]',
            err?.response?.data || err?.message || err
          );
          Alert.alert('오류', '이미지 업로드에 실패했습니다.');
          return; // 업로드 실패 시 게시글 생성/수정 중단
        }
      }
      const finalImageUrls = [...normalizedRemoteUris, ...uploadedUrls];

      /** ------------------------------------------------------
       * (B) 기간: 시작=지금, 종료=선택일(없으면 시작일 동일) 끝시간 23:59:59
       * -----------------------------------------------------*/
      const start = new Date();
      const endDate = applyDate ?? start;
      const endLocal = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59
      );

      /** ------------------------------------------------------
       * (C) 서버 DTO
       * -----------------------------------------------------*/
      const payload: CreateNoticeRequest = {
        title: title.trim(),
        content: desc.trim(),
        status: 'RECRUITING',
        link: applyUrl.trim() || undefined,
        startDate: toLocalDateTimeString(start),
        endDate: toLocalDateTimeString(endLocal),
        imageUrls: finalImageUrls.length ? finalImageUrls : undefined, // ✅ 업로드 결과/기존 상대경로
      };

      console.log('[NOTICE CREATE/PATCH PAYLOAD]', payload);

      if (mode === 'edit' && editId) {
        await updateNotice(editId, payload);
        Alert.alert('완료', '공지 수정이 완료되었습니다.');
        navigation.navigate('NoticeDetail', { id: String(editId), isAdmin: true });
      } else {
        const { noticeId, message } = await createNotice(payload);
        console.log('[NOTICE CREATE RES]', { noticeId, message });
        Alert.alert('완료', `공지 등록 완료 (#${noticeId})`);
        navigation.navigate('NoticeDetail', { id: String(noticeId), isAdmin: true });
      }

      /** ------------------------------------------------------
       * (D) 폼 초기화
       * -----------------------------------------------------*/
      setTitle('');
      setDesc('');
      setApplyUrl('');
      setImages([]);
      setApplyDate(null);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const msg =
        data?.message ||
        data?.error ||
        e?.message ||
        '서버 통신 중 오류가 발생했습니다.';
      console.log('[NOTICE SUBMIT ERR STATUS]', status);
      console.log('[NOTICE SUBMIT ERR DATA]', data);

      if (status === 401) {
        Alert.alert('로그인 필요', '로그인이 만료되었어요. 다시 로그인 해주세요.');
      } else if (status === 403) {
        Alert.alert('권한 없음', '관리자만 공지를 등록/수정할 수 있어요.');
      } else if (status === 404) {
        Alert.alert('경로 오류', '요청 주소를 확인해주세요. (/board/notices)');
      } else {
        Alert.alert('오류', msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    submitting,
    images,
    title,
    desc,
    applyUrl,
    applyDate,
    mode,
    editId,
    navigation,
    setImages,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../assets/images/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? '공지 수정' : '공지 등록'}
        </Text>
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
          maxLength={150}
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

        {/* 신청 기간(마감일) */}
        <Text style={styles.label}>신청 기간</Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setDateOpen(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.dateText}>
            {applyDate ? formatKoreanDate(applyDate) : '날짜를 선택하세요'}
          </Text>
          <Image
            source={require('../../assets/images/down.png')}
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

        {/* 작성/수정 완료 */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!canSubmit || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={submit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
            {mode === 'edit'
              ? submitting
                ? '수정 중...'
                : '수정 완료'
              : submitting
              ? '작성 중...'
              : '작성 완료'}
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
          // 시/분은 고정(정오)으로 저장 → 서버에서 날짜만 의미 있게 사용
          const picked = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
            12,
            0,
            0
          );
          setApplyDate(picked);
          setDateOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
