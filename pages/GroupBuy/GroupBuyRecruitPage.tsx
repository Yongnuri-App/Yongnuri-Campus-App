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
import styles, { COLORS } from './GroupBuyRecruitPage.styles';

// 프로젝트 공통 포토피커 사용 (경로는 프로젝트에 맞게 조정)
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';

type RecruitMode = 'unlimited' | 'limited' | null;

interface Props {
  navigation?: any; // TODO: RootStackParamList로 교체
}

const GroupBuyRecruitPage: React.FC<Props> = ({ navigation }) => {
  // ===== 사진/폼 상태 =====
  const MAX_PHOTOS = 10;
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [recruitMode, setRecruitMode] = useState<RecruitMode>(null); // ✅ 초기: 미선택
  const [recruitCount, setRecruitCount] = useState<string>('');       // 숫자만
  const [applyLink, setApplyLink] = useState('');
  
  // 사진 추가 버튼 눌렀을 때 실행할 로직 (예: ImagePicker 호출 후 결과 반영)
  const handleAddPress = async () => {
  // TODO: 실제 ImagePicker 연결
  // const pickedUris = await openImagePicker();
  // setImages(prev => [...prev, ...pickedUris].slice(0, MAX_PHOTOS));
  };

  // 숫자만 입력되도록 보정
  const onChangeRecruitCount = (txt: string) => {
    setRecruitCount(txt.replace(/[^\d]/g, ''));
  };

  // 제출 가능 여부
  const canSubmit = useMemo(() => {
    if (!title.trim() || !desc.trim() || !applyLink.trim()) return false;
    if (recruitMode === null) return false;
    if (recruitMode === 'limited') {
      const n = Number(recruitCount);
      if (!recruitCount || Number.isNaN(n) || n <= 0) return false;
    }
    return true;
  }, [title, desc, applyLink, recruitMode, recruitCount]);

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert('입력 확인', '필수 항목을 채워주세요.');
      return;
    }
    // TODO: 백엔드 API 연동
    const payload = {
      images,
      title: title.trim(),
      description: desc.trim(),
      recruit: {
        mode: recruitMode,
        count: recruitMode === 'limited' ? Number(recruitCount) : null,
      },
      applyLink: applyLink.trim(),
    };
    console.log('[GroupBuyRecruit] submit payload:', payload);
    Alert.alert('등록 완료', '공동구매 모집글이 등록되었습니다.', [
      { text: '확인', onPress: () => navigation?.goBack?.() },
    ]);
  };

  return (
    // ✅ 1) 전체를 KAV로 감싸 키보드 대응
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ✅ 2) 내부는 ScrollView + inner 패딩으로 통일 */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== Header ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
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
            <Text style={styles.headerTitle}>공동구매 모집</Text>
          </View>
        </View>

        {/* ===== 사진 ===== */}
        <View style={styles.section}>
          <Text style={styles.label}>사진</Text>
          <PhotoPicker
            images={images}
            max={10}
            onAddPress={() => {
                // TODO: 나중에 카메라/갤러리 기능 붙이기
                Alert.alert('사진 추가', '사진 선택 기능은 추후 구현 예정입니다.');
            }}
            onRemoveAt={(index) => setImages(prev => prev.filter((_, i) => i !== index))}
          />
        </View>

        {/* ===== 제목 ===== */}
        <View style={styles.section}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="글 제목"
            placeholderTextColor={COLORS.placeholder}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            returnKeyType="next"
          />
        </View>

        {/* 설명 섹션 (큰 테두리 박스가 필요하면 card로 감싸기) */}
        <View style={styles.section}>
            <Text style={styles.label}>설명</Text>
            <View style={styles.card}>
                <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="용누리 캠퍼스에 올릴 게시글 내용을 작성해주세요."
                placeholderTextColor={COLORS.placeholder}
                value={desc}
                onChangeText={setDesc}
                multiline
                textAlignVertical="top"
                />
            </View>
        </View>

        {/* ===== 모집 인원 ===== */}
        <View style={styles.section}>
            <Text style={styles.label}>모집 인원</Text>

            <View style={styles.chipsRow}>
                {/* 제한 없음 */}
                <TouchableOpacity
                    style={[
                        styles.chipOutline, // 기본: 흰배경+보더
                        recruitMode === 'unlimited' && styles.chipFilledDark, // 활성: 어두운 배경
                    ]}
                    onPress={() => {
                        setRecruitMode('unlimited');
                        setRecruitCount('');
                    }}
                    >
                    <Text
                        style={[
                        styles.chipTextDark,             // 기본(비활성) 텍스트
                        recruitMode === 'unlimited' && styles.chipTextLight, // 활성: 흰글씨
                        ]}
                    >
                        제한 없음
                    </Text>
                </TouchableOpacity>

                {/* 인원 제한 */}
                <TouchableOpacity
                    style={[
                        styles.chipOutline, // 기본: 흰배경+보더 (비활성)
                        recruitMode === 'limited' && styles.chipFilledDark, // 활성: 어두운 배경
                    ]}
                    onPress={() => setRecruitMode('limited')}
                    >
                    <Text
                        style={[
                        styles.chipTextDark,            // 비활성
                        recruitMode === 'limited' && styles.chipTextLight, // 활성
                        ]}
                    >
                        인원 제한
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 숫자 입력 */}
            <View style={styles.countRow}>
                <TextInput
                style={[
                    styles.countInputBase,
                    recruitMode === 'limited' ? styles.countInputActive : styles.countInputDisabled,
                ]}
                value={recruitCount}
                onChangeText={onChangeRecruitCount}
                placeholder="10"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="number-pad"
                editable={recruitMode === 'limited'}
                maxLength={4}
                />
                <Text style={styles.countSuffix}>명</Text>
            </View>
        </View>

        {/* ===== 모집 신청 링크 ===== */}
        <View style={styles.section}>
          <Text style={styles.label}>모집 신청 링크</Text>
          <TextInput
            style={styles.input}
            placeholder="신청서를 받을 링크 주소를 입력해주세요."
            placeholderTextColor={COLORS.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={applyLink}
            onChangeText={setApplyLink}
          />
        </View>

        {/* ===== 작성 완료 버튼 ===== */}
        <TouchableOpacity
          style={[styles.submitButton]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>작성 완료</Text>
        </TouchableOpacity>

        {/* 홈 인디케이터 여백 */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default GroupBuyRecruitPage;