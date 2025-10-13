// pages/Report/ReportPage.tsx
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './ReportPage.styles';

import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';
import type { RootStackScreenProps } from '../../types/navigation';

// ✅ 관리자 검토용 로컬 유틸(그대로 유지)
import {
  ReportType,           // '부적절한 콘텐츠' | '사기/스팸' | '욕설/혐오' | '기타'
  StoredReport,
  approveReport,
  rejectReport,
} from '../../utils/reportActions';

// ✅ 서버 연동용 API
import {
  createReport,
  mapKindToPostType,
  mapReportReason,
} from '../../api/report';

const REPORT_TYPES: ReportType[] = ['부적절한 콘텐츠', '사기/스팸', '욕설/혐오', '기타'];
const REPORTS_KEY = 'reports_v1';
const { width: SCREEN_W } = Dimensions.get('window');

export default function ReportPage({
  navigation,
  route,
}: RootStackScreenProps<'Report'>) {
  const mode: 'compose' | 'review' = (route.params as any)?.mode ?? 'compose';
  const reviewId = (route.params as any)?.reportId as string | undefined;
  const isReview = mode === 'review' && !!reviewId;

  // ---------- compose 상태 ----------
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeValue, setTypeValue] = useState<ReportType | null>(null);
  const [content, setContent] = useState('');
  const { images, openAdd, removeAt, max, setImages } = useImagePicker({ max: 10 });

  // ---------- review 로드 ----------
  const [loaded, setLoaded] = useState<StoredReport | null>(null);

  // ---------- 이미지 뷰어 ----------
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

  // ----- 신고 타겟 파라미터 -----
  const p = (route.params as any) ?? {};
  const targetLabelParam = p.targetLabel as string | undefined;
  const targetNicknameParam = p.targetNickname as string | undefined;
  const targetDeptParam = p.targetDept as string | undefined;
  const targetEmailParam = p.targetEmail as string | null | undefined;

  // 서버로 보낼 메타
  const targetPostIdParam = p.targetPostId as string | number | undefined;
  const targetKindParam = p.targetKind as
    | 'market'
    | 'lost'
    | 'groupbuy'
    | 'notice'
    | 'chat'
    | 'admin'
    | undefined;

  // compose 표시 라벨
  const targetLabelCompose = useMemo(() => {
    if (targetLabelParam && targetLabelParam.trim()) return targetLabelParam.trim();
    if (targetNicknameParam || targetDeptParam) {
      const left = (targetNicknameParam ?? '').trim();
      const right = (targetDeptParam ?? '').trim();
      if (left && right) return `${left} - ${right}`;
      if (left) return left;
      if (right) return right;
    }
    return '';
  }, [targetLabelParam, targetNicknameParam, targetDeptParam]);

  // review 표시 라벨
  const targetLabelReview = useMemo(() => {
    if (!loaded) return '';
    if (loaded.target?.label) return loaded.target.label;
    const left =
      loaded.target?.nickname ??
      (loaded.target?.email ? loaded.target.email.split('@')[0] : '');
    const right = loaded.target?.dept ?? '';
    if (left && right) return `${left} - ${right}`;
    return left || right || '';
  }, [loaded]);

  const targetLabel = isReview ? targetLabelReview : targetLabelCompose;

  // review 로컬 로드
  useEffect(() => {
    if (!isReview) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(REPORTS_KEY);
        const list: StoredReport[] = raw ? JSON.parse(raw) : [];
        const found = list.find((r) => r.id === reviewId) ?? null;
        setLoaded(found || null);
        if (found) {
          setTypeValue(found.type);
          setContent(found.content);
          setImages(found.images ?? []);
        }
      } catch (e) {
        console.log('report review load error', e);
      }
    })();
  }, [isReview, reviewId, setImages]);

  // ===== compose 제출 → 서버 /report =====
  const onSubmitCompose = async () => {
    if (!typeValue) {
      Alert.alert('안내', '신고 유형을 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('안내', '신고 내용을 작성해주세요.');
      return;
    }

    try {
      // 서버 enum으로 변환
      const postType = mapKindToPostType(targetKindParam);
      const reason = mapReportReason(typeValue);

      // 숫자인 postId만 보냄 (문자면 서버 Long 파싱 오류 방지)
      const toNumeric = (v: any): number | undefined => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
        return undefined;
      };
      const postIdNumeric = toNumeric(targetPostIdParam);

      // 이미지: 서버 명세가 URL 배열만 허용 → http(s)만 필터
      const httpImages = (images ?? []).filter((u) => /^https?:\/\//i.test(u));

      await createReport({
        postType,
        postId: postIdNumeric,     // undefined면 생략되어 전송됨
        reason,
        content: content.trim(),
        imageUrls: httpImages,
        // reportedId는 현재 이메일만 있어 숫자 ID가 없으므로 보내지 않음(서버 Long 파싱 에러 회피)
      });

      Alert.alert('제출 완료', '신고가 접수되었습니다. 확인 후 조치하겠습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.log('report submit error', e?.response?.data || e);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        '제출에 실패했어요. 잠시 후 다시 시도해주세요.';
      Alert.alert('오류', msg);
    }
  };

  // ===== 관리자 처리 (로컬 유지) =====
  const onPressOutline = async () => {
    if (!isReview || !reviewId) return;
    try {
      await rejectReport(reviewId);
      Alert.alert('처리 완료', '미인정 처리되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.log('reject error', e);
      Alert.alert('오류', e?.message ?? '처리에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const onPressFilled = async () => {
    if (!isReview || !reviewId) return;
    try {
      await approveReport(reviewId);
      Alert.alert('처리 완료', '인정 처리되어 게시글이 삭제되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.log('approve error', e);
      Alert.alert('오류', e?.message ?? '처리에 실패했습니다. 다시 시도해주세요.');
    }
  };

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
          <Image
            source={require('../../assets/images/back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isReview ? '신고 상세' : '신고하기'}</Text>
        <View style={styles.rightSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentWithBottom}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 신고 할 유저 */}
          <View style={styles.section}>
            <Text style={styles.label}>신고 할 유저</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText} numberOfLines={1}>
                {targetLabel || '선택된 유저 없음'}
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
                <TouchableOpacity
                  style={styles.selectBox}
                  activeOpacity={0.8}
                  onPress={() => setTypeOpen((p) => !p)}
                >
                  {typeValue ? (
                    <Text style={styles.selectText} numberOfLines={1}>
                      {typeValue}
                    </Text>
                  ) : (
                    <Text style={styles.selectTextPlaceholder} numberOfLines={1}>
                      신고 유형을 선택해주세요.
                    </Text>
                  )}

                  <Image
                    source={require('../../assets/images/down.png')}
                    style={styles.dropdownIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {typeOpen && (
                  <>
                    <TouchableOpacity
                      style={styles.dim}
                      activeOpacity={1}
                      onPress={() => setTypeOpen(false)}
                    />
                    <View style={styles.menu}>
                      {REPORT_TYPES.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.menuItem}
                          activeOpacity={0.8}
                          onPress={() => {
                            setTypeValue(opt);
                            setTypeOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.menuItemText,
                              opt === typeValue && styles.menuItemTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
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
                placeholder="신고 내용을 작성해주세요. 예) 부적절한 사진, 합의되지 않은 요구 등"
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
                    <TouchableOpacity
                      key={`${uri}-${i}`}
                      onPress={() => onThumbPress(i)}
                      activeOpacity={0.9}
                    >
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
            <TouchableOpacity
              onPress={onPressOutline}
              activeOpacity={0.9}
              style={styles.reviewBtnOutline}
            >
              <Text style={styles.reviewBtnTextOutline}>미인정</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onPressFilled}
              activeOpacity={0.9}
              style={styles.reviewBtnFilled}
            >
              <Text style={styles.reviewBtnTextFilled}>인정</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.fixedSubmitWrap} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.9}
              onPress={onSubmitCompose}
            >
              <Text style={styles.submitText}>제출하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* 전체화면 이미지 뷰어 */}
      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View style={styles.viewerWrap}>
          <TouchableOpacity
            style={styles.viewerCloseBtn}
            onPress={() => setViewerOpen(false)}
            activeOpacity={0.8}
          >
            <Image
              source={require('../../assets/images/close.png')}
              style={styles.viewerCloseIcon}
            />
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
