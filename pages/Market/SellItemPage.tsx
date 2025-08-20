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
import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import styles from './SellItemPage.styles';

// 판매/나눔 모드 타입
type SaleMode = 'sell' | 'donate' | null;

interface Props {
  navigation?: any; // TODO: React Navigation 타입을 사용 중이면 적절한 Stack Param을 연결해주세요.
}

/** 숫자만 받은 뒤 "₩ 12,345" 형태로 보여주기 */
const formatKRW = (digits: string) => {
  if (!digits) return '';
  const n = Number(digits);
  if (Number.isNaN(n)) return '';
  return `₩ ${n.toLocaleString('ko-KR')}`;
};

const SellItemPage: React.FC<Props> = ({ navigation }) => {
  // 사진 최대 10장
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [mode, setMode] = useState<SaleMode>(null); // 기본: 판매하기
  const [priceRaw, setPriceRaw] = useState<string>(''); // 숫자만 저장
  const [location, setLocation] = useState<string>('');

  const isDonation = useMemo(() => mode === 'donate', [mode]);
  const isSell = useMemo(() => mode === 'sell', [mode]);
  const priceDisplay = useMemo(() => formatKRW(priceRaw), [priceRaw]);

  /** 뒤로가기 */
  const goBack = () => {
    if (navigation?.goBack) return navigation.goBack();
    // 네비게이션이 없다면: 여기서는 안전하게 경고만
    Alert.alert('뒤로가기', '네비게이션이 연결되어 있지 않습니다.');
  };

  /** 모드 변경: 판매하기/나눔하기 */
  const handleChangeMode = (next: SaleMode) => {
    setMode(next);
    if (next === 'donate') setPriceRaw(''); // 나눔 전환 시 가격 초기화
  };

  /** 사진 추가 (Mock)
   * - 실제 구현 시 ImagePicker.launchImageLibraryAsync() 등으로 교체
   * - 여기서는 최대 10장 제한만 동작
   */
  const handleAddPhoto = async () => {
    if (images.length >= 10) {
      Alert.alert('알림', '사진은 최대 10장까지 업로드할 수 있어요.');
      return;
    }
    // TODO: ImagePicker 연결
    // 예시로 임시 URI를 추가
    const fakeUri = `local://image-${Date.now()}.jpg`;
    setImages(prev => [...prev, fakeUri]);
  };

  /** 작성 완료 */
  const handleSubmit = () => {
    // 간단 검증
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!desc.trim()) {
      Alert.alert('알림', '설명을 입력해주세요.');
      return;
    }
    if (mode === null) {
      Alert.alert('알림', '거래 방식을 선택해주세요.');
      return;
    }
    if (!isDonation && !priceRaw.trim()) {
      Alert.alert('알림', '판매하기를 선택한 경우 가격을 입력해주세요.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('알림', '거래 희망 장소를 선택해주세요.');
      return;
    }

    // TODO: 백엔드 API 연결
    // 요청 바디 예시
    const payload = {
      title: title.trim(),
      description: desc.trim(),
      mode,
      price: isDonation ? 0 : Number(priceRaw),
      location: location.trim(),
      images, // URI 리스트 (실제 업로드는 업로드 후 받은 URL들로 교체)
    };

    console.log('📝 제출 페이로드:', payload);
    Alert.alert('완료', '게시글이 작성되었습니다. (API 연결 TODO)');
    navigation?.goBack?.();
  };

return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      {/* ScrollView 내부에 inner 컨테이너로 전체 여백/레이아웃 관리 */}
      <ScrollView contentContainerStyle={styles.inner}>
        {/* 상단 헤더: 뒤로가기 + 중앙 타이틀 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* 타이틀을 항상 가운데 정렬(왼쪽 버튼 폭과 무관) */}
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>내 물건 팔기</Text>
          </View>
        </View>

        {/* 사진 영역 */}
        <PhotoPicker
          images={images}
          max={10}
          onAddPress={handleAddPhoto}
        />

        {/* 제목 */}
        <View style={styles.field}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="글 제목"
            placeholderTextColor="#979797"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </View>

        {/* 설명 */}
        <View style={styles.field}>
          <Text style={styles.label}>설명</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="용누리 캠퍼스에 올릴 게시글 내용을 작성해주세요."
            placeholderTextColor="#979797"
            value={desc}
            onChangeText={setDesc}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 거래방식 + 가격 */}
        <View style={styles.field}>
          <Text style={styles.label}>거래 방식</Text>

          {/* 모드 토글: 판매하기 / 나눔하기 */}
          <View style={styles.modeRow}>
            <TouchableOpacity
                onPress={() => handleChangeMode('sell')}
                style={[styles.modeChip, mode === 'sell' ? styles.modeChipActiveFill : styles.modeChipOutline]}
                activeOpacity={0.8}
            >
                {/* 활성 시 글자도 진하게 */}
                <Text style={[styles.modeChipText, mode === 'sell' ? styles.modeChipTextLight : styles.modeChipTextDark]}>
                판매하기
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleChangeMode('donate')}
                style={[styles.modeChip, mode === 'donate' ? styles.modeChipActiveFill : styles.modeChipOutline]}
                activeOpacity={0.8}
            >
                <Text style={[styles.modeChipText, mode === 'donate' ? styles.modeChipTextLight : styles.modeChipTextDark]}>
                나눔하기
                </Text>
            </TouchableOpacity>
          </View>

          {/* 가격 입력: 판매하기일 때만 활성화 */}
          <TextInput
            style={[styles.input, !isSell && styles.inputDisabled]}
            placeholder="￦ 0"
            placeholderTextColor="#979797"
            value={priceDisplay}
            onChangeText={(t) => {
              // 사용자가 입력한 문자열에서 숫자만 추출
              const onlyDigits = t.replace(/[^\d]/g, '');
              setPriceRaw(onlyDigits);
            }}
            editable={!isDonation}
            keyboardType="number-pad"
          />
        </View>

        {/* 거래 희망 장소 */}
        <LocationPicker
          value={location}
          onChange={setLocation}
          placeholder="장소를 선택해 주세요."
        />

        {/* 스크롤 하단 여백 */}
        <View style={styles.submitSpacer} />
      </ScrollView>

      {/* 하단 고정: 작성 완료 버튼 */}
      <View style={styles.submitWrap}>
        <TouchableOpacity style={styles.submitButton} activeOpacity={0.9} onPress={handleSubmit}>
          <Text style={styles.submitText}>작성 완료</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default SellItemPage;