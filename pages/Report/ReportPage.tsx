import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image as RNImage,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import styles from './ReportPage.styles';
import type { RootStackScreenProps } from '../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';

// 서버 API/매퍼
import {
  createReport,
  mapKindToPostType,
  mapReportReason,
  mapReasonEnumToKor,
  getAdminReportDetail,
  adminProcessReport,
  type ReportPostType,
  type ReportReason,
} from '../../api/report';

const REPORT_TYPES_KOR = ['부적절한 콘텐츠', '사기/스팸', '욕설/혐오', '홍보/광고', '사칭/허위정보', '기타'] as const;
type ReportTypeKor = (typeof REPORT_TYPES_KOR)[number];

const { width: SCREEN_W } = Dimensions.get('window');

// 숫자 변환 유틸
const toNum = (v: any): number | undefined =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && /^\d+$/.test(v.trim())
    ? Number(v.trim())
    : undefined;

export default function ReportPage({ navigation, route }: RootStackScreenProps<'Report'>) {
  const mode: 'compose' | 'review' = (route.params as any)?.mode ?? 'compose';
  const reviewId = (route.params as any)?.reportId as string | number | undefined;
  const isReview = mode === 'review' && !!reviewId;

  // compose 입력 상태
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeValue, setTypeValue] = useState<ReportTypeKor | null>(null);
  const [content, setContent] = useState('');
  const { images, openAdd, removeAt, max, setImages } = useImagePicker({ max: 10 });

  // review 로드 상태(서버/로컬)
  const [loaded, setLoaded] = useState<any | null>(null);

  // 이미지 뷰어
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const hScrollRef = useRef<ScrollView | null>(null);
  const onThumbPress = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };
  const onViewerMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setViewerIndex(Math.round(x / SCREEN_W));
  };

  // ----- 타겟 파라미터 -----
  const p = (route.params as any) ?? {};
  const targetNicknameParam = p.targetNickname as string | undefined;
  const targetDeptParam = p.targetDept as string | undefined;
  const targetEmailParam = p.targetEmail as string | null | undefined;
  const targetPostIdParam = p.targetPostId as string | undefined;
  const targetUserIdParam = p.targetUserId as string | number | undefined;
  const targetKindParam = p.targetKind as
    | 'market'
    | 'lost'
    | 'groupbuy'
    | 'notice'
    | 'chat'
    | 'admin'
    | undefined;

  // 표시 라벨(닉네임 - 학과 or 이메일)
  const targetLabelCompose = useMemo(() => {
    const left =
      (targetNicknameParam && targetNicknameParam.trim()) ||
      (targetEmailParam ? String(targetEmailParam).split('@')[0] : '');
    const right = (targetDeptParam ?? '').trim();
    if (left && right) return `${left} - ${right}`;
    return left || right || '';
  }, [targetNicknameParam, targetDeptParam, targetEmailParam]);

  /* ================== review 모드: 서버 신고 상세 불러오기 ================== */
  useEffect(() => {
    if (!isReview || !reviewId) return;

    (async () => {
      try {
        const d = await getAdminReportDetail(reviewId);
        console.log('[REPORT review] server detail =', d);
        setLoaded(d);

        // 한글 라벨 매핑
        const kor = mapReasonEnumToKor(d.reason || '');
        setTypeValue((kor as ReportTypeKor) ?? null);
        setContent(d.content ?? '');

        // 이미지 세팅
        const imgUris =
          Array.isArray(d.images) && d.images.length
            ? d.images
                .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
                .map((x) => x.imageUrl)
            : [];
        setImages(imgUris);
      } catch (e) {
        console.log('[REPORT review] server detail error, try local fallback', e);
        try {
          const raw = await AsyncStorage.getItem('reports_v1');
          const list: any[] = raw ? JSON.parse(raw) : [];
          const found = list.find((r) => String(r.id) === String(reviewId)) ?? null;
          setLoaded(found || null);
          if (found) {
            setTypeValue((found.type as ReportTypeKor) ?? null);
            setContent(found.content ?? '');
            setImages(found.images ?? []);
          }
        } catch (err) {
          console.log('report review local load error', err);
        }
      }
    })();
  }, [isReview, reviewId, setImages]);

  /* ================== compose 제출 ================== */
  const onSubmitCompose = async () => {
    if (!typeValue) return Alert.alert('안내', '신고 유형을 선택해주세요.');
    if (!content.trim()) return Alert.alert('안내', '신고 내용을 작성해주세요.');

    try {
      const postType: ReportPostType = mapKindToPostType(targetKindParam);
      const reason: ReportReason = mapReportReason(typeValue);

      const postIdNum =
        typeof targetPostIdParam === 'string' && /^\d+$/.test(targetPostIdParam)
          ? Number(targetPostIdParam)
          : undefined;

      const reportedIdNum = toNum(targetUserIdParam);

      // ✅ 필수값 가드: CHAT이면 reportedId, 그 외에는 postId 필요
      if (postType === 'CHAT') {
        if (reportedIdNum === undefined) {
          Alert.alert('안내', '대상 사용자 ID를 찾을 수 없어요. (reportedId)');
          return;
        }
      } else {
        if (postIdNum === undefined) {
          Alert.alert('안내', '게시글 ID를 찾을 수 없어요. (postId)');
          return;
        }
      }

      const payload = {
        postType,
        postId: postIdNum,
        reportedId: reportedIdNum,
        reason,
        content: content.trim(),
        imageUrls: images,
      };

      await createReport(payload);
      Alert.alert('제출 완료', '신고가 접수되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      console.log('[report submit error]', e?.response?.data || e);
      Alert.alert('오류', e?.response?.data?.message || e?.message || '제출에 실패했어요.');
    }
  };

  /* ================== review 모드 액션 (서버 처리) ================== */
  const onPressOutline = async () => {
    if (!isReview || !reviewId) return;
    try {
      await adminProcessReport(reviewId, 'REJECTED');
      Alert.alert('처리 완료', '미인정 처리되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.message ?? '처리에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const onPressFilled = async () => {
    if (!isReview || !reviewId) return;
    try {
      await adminProcessReport(reviewId, 'APPROVED');
      Alert.alert('처리 완료', '인정 처리되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.message ?? '처리에 실패했습니다. 다시 시도해주세요.');
    }
  };

  /* ================== UI ================== */
  const headerTitle = isReview ? '신고 상세' : '신고하기';

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Image source={require('../../assets/images/back.png')} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.rightSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentWithBottom}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 신고 대상 */}
          <View style={styles.section}>
            <Text style={styles.label}>신고 할 유저</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText} numberOfLines={1}>
                {isReview
                  ? (() => {
                      const left =
                        loaded?.reportedStudentNickName ||
                        loaded?.reportedStudentName ||
                        '';
                      const right = ''; // 상세 응답에 학과가 없다면 비움
                      if (left && right) return `${left} - ${right}`;
                      return left || right || '';
                    })()
                  : targetLabelCompose || '선택된 유저 없음'}
              </Text>
            </View>
          </View>

          {/* 신고 유형 */}
          <View style={styles.section}>
            <Text style={styles.label}>신고 유형</Text>
            {isReview ? (
              <View style={styles.readonlyBox}>
                <Text style={styles.readonlyText}>{typeValue ?? '-'}</Text>
              </View>
            ) : (
              <View>
                <TouchableOpacity style={styles.selectBox} activeOpacity={0.8} onPress={() => setTypeOpen((p) => !p)}>
                  {typeValue ? (
                    <Text style={styles.selectText} numberOfLines={1}>
                      {typeValue}
                    </Text>
                  ) : (
                    <Text style={styles.selectTextPlaceholder} numberOfLines={1}>
                      신고 유형을 선택해주세요.
                    </Text>
                  )}

                  <Image source={require('../../assets/images/down.png')} style={styles.dropdownIcon} resizeMode="contain" />
                </TouchableOpacity>

                {typeOpen && (
                  <>
                    <TouchableOpacity style={styles.dim} activeOpacity={1} onPress={() => setTypeOpen(false)} />
                    <View style={styles.menu}>
                      {REPORT_TYPES_KOR.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.menuItem}
                          activeOpacity={0.8}
                          onPress={() => {
                            setTypeValue(opt);
                            setTypeOpen(false);
                          }}
                        >
                          <Text style={[styles.menuItemText, opt === typeValue && styles.menuItemTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* 신고 내용 */}
          <View style={styles.section}>
            <Text style={styles.label}>신고 내용</Text>
            {isReview ? (
              <View style={styles.readonlyTextArea}>
                <Text style={styles.readonlyParagraph}>{content || '-'}</Text>
              </View>
            ) : (
              <TextInput
                style={styles.textArea}
                placeholder="신고 내용을 작성해주세요. 예) 부적절한 사진이 올라와 있어요."
                placeholderTextColor="#979797"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />
            )}
          </View>

          {/* 사진 */}
          <View style={styles.section}>
            <Text style={styles.label}>사진</Text>
            {isReview ? (
              <View style={styles.thumbWrap}>
                {(images ?? []).length === 0 ? (
                  <Text style={styles.thumbEmpty}>첨부된 사진이 없습니다.</Text>
                ) : (
                  images.map((uri, i) => (
                    <TouchableOpacity key={`${uri}-${i}`} onPress={() => onThumbPress(i)} activeOpacity={0.9}>
                      <RNImage source={{ uri }} style={styles.thumb} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              <PhotoPicker images={images} max={max} onAddPress={openAdd} onRemoveAt={removeAt} />
            )}
          </View>
        </ScrollView>

        {/* 하단 고정 바 */}
        {isReview ? (
          <View style={[styles.fixedSubmitWrap, styles.reviewActionsWrap]}>
            <TouchableOpacity onPress={onPressOutline} activeOpacity={0.9} style={styles.reviewBtnOutline}>
              <Text style={styles.reviewBtnTextOutline}>미인정</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onPressFilled} activeOpacity={0.9} style={styles.reviewBtnFilled}>
              <Text style={styles.reviewBtnTextFilled}>인정</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.fixedSubmitWrap} pointerEvents="box-none">
            <TouchableOpacity style={styles.submitButton} activeOpacity={0.9} onPress={onSubmitCompose}>
              <Text style={styles.submitText}>제출하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* 이미지 뷰어 */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewerWrap}>
          <TouchableOpacity style={styles.viewerCloseBtn} onPress={() => setViewerOpen(false)} activeOpacity={0.8}>
            <Image source={require('../../assets/images/close.png')} style={styles.viewerCloseIcon} />
          </TouchableOpacity>

          <ScrollView
            ref={hScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: viewerIndex * SCREEN_W, y: 0 }}
            onMomentumScrollEnd={onViewerMomentumEnd}
          >
            {(images ?? []).map((uri, i) => (
              <ScrollView
                key={`${uri}-${i}`}
                style={{ width: SCREEN_W }}
                maximumZoomScale={3}
                minimumZoomScale={1}
                contentContainerStyle={styles.viewerZoomItem}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <RNImage source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
              </ScrollView>
            ))}
          </ScrollView>

          <View style={styles.viewerIndicator}>
            <Text style={styles.viewerIndicatorText}>
              {viewerIndex + 1} / {(images ?? []).length || 0}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
