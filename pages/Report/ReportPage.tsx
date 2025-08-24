import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import styles from './ReportPage.styles';
import type { RootStackScreenProps } from '../../types/navigation';

// ✅ 사진 선택 UI & 훅
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';

type ReportType =
  | '부적절한 콘텐츠'
  | '사기/스팸'
  | '욕설/혐오'
  | '기타';

const REPORT_TYPES: ReportType[] = [
  '부적절한 콘텐츠',
  '사기/스팸',
  '욕설/혐오',
  '기타',
];

export default function ReportPage({
  navigation,
  route,
}: RootStackScreenProps<'Report'>) {
  const targetLabel = useMemo(
    () => route?.params?.targetLabel ?? '',
    [route?.params?.targetLabel]
  );

  const [typeOpen, setTypeOpen] = useState(false);
  const [typeValue, setTypeValue] = useState<ReportType | null>(null);
  const [content, setContent] = useState('');

  // ✅ 사진 선택 훅 (최대 10장)
  const { images, openAdd, removeAt, max } = useImagePicker({ max: 10 });

  const onSubmit = () => {
    if (!typeValue) {
      Alert.alert('안내', '신고 유형을 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('안내', '신고 내용을 작성해주세요.');
      return;
    }
    // TODO: API 연결 시 images도 함께 전송
    Alert.alert('제출 완료', '신고가 접수되었습니다. 확인 후 조치하겠습니다.', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* ===== 헤더 ===== */}
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

        {/* 가운데 정렬 타이틀 */}
        <Text style={styles.headerTitle}>신고하기</Text>

        {/* 오른쪽 공간 확보용 */}
        <View style={styles.rightSpacer} />
      </View>

      {/* ===== 본문 ===== */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
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
          </View>

          {/* 신고 내용 */}
          <View style={styles.section}>
            <Text style={styles.label}>신고 내용</Text>
            <TextInput
              style={styles.textArea}
              placeholder="신고 내용을 작성해주세요. 예시) 부적절한 사진이 올라와있어요. 합의되지 않은 무리한 요구를 했어요."
              placeholderTextColor="#979797"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* ✅ 사진 섹션 (피그마의 카메라 타일 + 0/10) */}
          <View style={styles.section}>
            <Text style={styles.label}>사진</Text>
            <PhotoPicker
              images={images}
              max={max}
              onAddPress={openAdd}
              onRemoveAt={removeAt}
            />
          </View>
        </ScrollView>

        {/* 하단 고정 제출 버튼 */}
        <View style={styles.fixedSubmitWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.submitButton}
            activeOpacity={0.9}
            onPress={onSubmit}
          >
            <Text style={styles.submitText}>제출하기</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
