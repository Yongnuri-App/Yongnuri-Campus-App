// pages/LostAndFound/LostPostCreatePage.tsx
import React, { useCallback, useMemo, useState } from 'react';
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
import styles from './LostPostPage.styles';

import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';

type Purpose = 'lost' | 'found';

interface Props {
  navigation?: any; // TODO: React Navigation 타입으로 교체
}

const LostPostPage: React.FC<Props> = ({ navigation }) => {
  // 사진 목록(URI 배열)
  const [images, setImages] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [place, setPlace] = useState<string>('');

  const MAX_PHOTOS = 10;

  const canSubmit = useMemo(
    () => Boolean(purpose && title.trim() && desc.trim() && place.trim()),
    [purpose, title, desc, place]
  );

  const handleGoBack = useCallback(() => {
    navigation?.goBack?.();
  }, [navigation]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) {
      Alert.alert('작성 안내', '작성 목적, 제목, 설명, 장소를 모두 입력해 주세요.');
      return;
    }

    const payload = {
      type: purpose,
      title: title.trim(),
      content: desc.trim(),
      location: place.trim(),
      photos: images, // TODO: 백엔드 스펙에 맞게 uri → 업로드/변환
    };

    console.log('📝 Lost/Found Create Payload:', payload);
    Alert.alert('등록 완료', '분실물 게시글이 작성되었습니다.');
    navigation?.goBack?.();
  }, [canSubmit, desc, images, navigation, place, purpose, title]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      {/* inner: 화면 공통 여백/레이아웃을 한 곳에서 관리 */}
      <View style={styles.inner}>
        {/* ===== 헤더 ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
          >
            {/* 요청한 아이콘 사용 */}
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>분실물 센터</Text>
          </View>
        </View>

        {/* ===== 본문 ===== */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 사진 영역 */}
          <PhotoPicker
            images={images}
            max={10}
            onAddPress={() => {
                // TODO: 나중에 카메라/갤러리 기능 붙이기
                Alert.alert('사진 추가', '사진 선택 기능은 추후 구현 예정입니다.');
            }}
            onRemoveAt={(index) => setImages(prev => prev.filter((_, i) => i !== index))}
          />

          {/* 작성 목적 (분실/습득) */}
          <View style={styles.block}>
            <Text style={styles.label}>작성 목적</Text>
            <Text style={styles.helper}>
              분실했나요, 아니면 물건을 주우셨나요? 해당하는 항목을 선택해주세요!
            </Text>

            <View style={styles.chipRow}>
              <TouchableOpacity
                onPress={() => setPurpose('lost')}
                style={[
                  styles.chip,
                  purpose === 'lost' ? styles.chipActive : styles.chipInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: purpose === 'lost' }}
              >
                <Text
                  style={[
                    styles.chipText,
                    purpose === 'lost' ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  분실
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPurpose('found')}
                style={[
                  styles.chip,
                  purpose === 'found' ? styles.chipActive : styles.chipInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: purpose === 'found' }}
              >
                <Text
                  style={[
                    styles.chipText,
                    purpose === 'found' ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  습득
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 제목 */}
          <View style={styles.block}>
            <Text style={styles.label}>제목</Text>
            <View style={styles.inputBox}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="글 제목"
                placeholderTextColor="#979797"
                style={styles.input}
                maxLength={50}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* 설명 */}
          <View style={styles.block}>
            <Text style={styles.label}>설명</Text>
            <View style={styles.textareaBox}>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder={
                  '용누리 캠퍼스에 올릴 게시글 내용을 작성해주세요.\n예시) 분실 / 습득한 장소와 대략적인 시간대, 구체적인 외형, 브랜드, 색상, 특징 등'
                }
                placeholderTextColor="#979797"
                style={styles.textarea}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>
          </View>

          {/* 장소 선택 */}
          <View style={styles.block}>
            {/* <Text style={styles.label}>분실 / 습득 장소</Text> */}
            <LocationPicker
              value={place}
              onChange={setPlace}
              placeholder="장소를 선택해 주세요."
              label="분실 / 습득 장소"  
            />
          </View>

          {/* 스크롤 하단 여백 확보 (버튼 공간만큼) */}
          <View style={styles.submitSpacer} />
        </ScrollView>

        {/* ===== 하단 고정 버튼 ===== */}
        <View style={styles.submitWrap}>
          <TouchableOpacity
            style={[styles.submitButton]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
        <Text style={styles.submitText}>작성 완료</Text>
      </TouchableOpacity>
    </View>
  </View>
</KeyboardAvoidingView>
  );
}

export default LostPostPage;
