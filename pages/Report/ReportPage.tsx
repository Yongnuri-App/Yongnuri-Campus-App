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
import styles from './ReportPage.styles';
import type { RootStackScreenProps } from '../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';

// ✅ 유틸로 분리된 타입/액션 사용 (여기서 알림 아이콘까지 처리됨)
import {
  ReportType,
  StoredReport,
  approveReport,
  rejectReport,
} from '../../utils/reportActions';

const REPORT_TYPES: ReportType[] = [
  '부적절한 콘텐츠',
  '사기/스팸',
  '욕설/혐오',
  '기타',
];
const REPORTS_KEY = 'reports_v1';
const { width: SCREEN_W } = Dimensions.get('window');

export default function ReportPage({
  navigation,
  route,
}: RootStackScreenProps<'Report'>) {
  const mode: 'compose' | 'review' = (route.params as any)?.mode ?? 'compose';
  const reviewId = (route.params as any)?.reportId as string | undefined;
  const isReview = mode === 'review' && !!reviewId;

  // ---------- compose 모드 입력 상태 ----------
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeValue, setTypeValue] = useState<ReportType | null>(null);
  const [content, setContent] = useState('');
  const { images, openAdd, removeAt, max, setImages } = useImagePicker({
    max: 10,
  });

  // ---------- review 모드 로드 상태 ----------
  const [loaded, setLoaded] = useState<StoredReport | null>(null);

  // ---------- 이미지 뷰어(모달) ----------
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

  // ----- 입력으로 넘어온 타겟 파라미터(호환 + 확장) -----
  const p = (route.params as any) ?? {};
  const targetLabelParam = p.targetLabel as string | undefined;
  const targetNicknameParam = p.targetNickname as string | undefined;
  const targetDeptParam = p.targetDept as string | undefined;
  const targetEmailParam = p.targetEmail as string | null | undefined;

  // ✅ 승인 시 정확한 삭제/문구를 위해 저장
  const targetPostIdParam = p.targetPostId as string | undefined;
  const targetStorageKeyParam = p.targetStorageKey as string | undefined;
  const targetPostTitleParam = p.targetPostTitle as string | undefined;
  const targetKindParam = p.targetKind as
    | 'market'
    | 'lost'
    | 'groupbuy'
    | 'notice'
    | undefined;

  // compose 모드 표시용 라벨(우선순위: label → nickname+dept 조합)
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

  // review 모드 라벨
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

  // 최종 표시 라벨
  const targetLabel = isReview ? targetLabelReview : targetLabelCompose;

  // review 로드
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

  // compose 제출
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
      const newItem: StoredReport = {
        id: String(Date.now()),
        target: {
          email: targetEmailParam ?? null,
          label: targetLabelCompose || undefined,

          // ✅ 승인 시 삭제/문구에 사용
          postId: targetPostIdParam,
          storageKey: targetStorageKeyParam,
          postTitle: targetPostTitleParam,
          kind: targetKindParam,
        },
        type: typeValue,
        content: content.trim(),
        images,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };

      const raw = await AsyncStorage.getItem(REPORTS_KEY);
      const list: StoredReport[] = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(list));

      Alert.alert('제출 완료', '신고가 접수되었습니다. 확인 후 조치하겠습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.log(e);
      Alert.alert(
        '오류',
        e?.message || '제출에 실패했어요. 잠시 후 다시 시도해주세요.'
      );
    }
  };

  // ✅ 관리자 처리: 반려/승인 (utils/reportActions 가 알림 + 아이콘까지 처리)
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
      await approveReport(reviewId); // ✅ 글 삭제 + 작성자 개인 알림(아이콘 포함)
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
        <Text style={styles.headerTitle}>
          {isReview ? '신고 상세' : '신고하기'}
        </Text>
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
                    <Text
                      style={styles.selectTextPlaceholder}
                      numberOfLines={1}
                    >
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
                placeholder="신고 내용을 작성해주세요. 예시) 부적절한 사진이 올라와있어요. 합의되지 않은 무리한 요구를 했어요."
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
              <PhotoPicker
                images={images}
                max={max}
                onAddPress={openAdd}
                onRemoveAt={removeAt}
              />
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

      {/* ✅ 전체화면 이미지 뷰어 */}
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
                <RNImage
                  source={{ uri }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
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
