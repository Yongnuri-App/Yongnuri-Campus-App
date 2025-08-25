// components/Bottom/DetailBottomBar.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useImagePicker } from '../../hooks/useImagePicker';
import type { RootStackParamList } from '../../types/navigation';
import styles from './DetailBottomBar.styles';

/** 어떤 화면에서 쓰는지 구분 */
type Variant = 'detail' | 'chat';

/** 상세 → ChatRoom으로 넘길 정보 */
type ChatAutoNavigateParams = {
  postId: string;
  sellerNickname: string;
  productTitle: string;
  productPrice: number;
  productImageUri?: string;
};

type Props = {
  /** 기본값은 'detail' (※ 채팅 화면에서는 반드시 variant="chat"으로 넘겨주세요) */
  variant?: Variant;

  // 상세 화면: 좋아요
  initialLiked?: boolean;
  onToggleLike?: (liked: boolean) => void;

  // 채팅 화면: 텍스트 전송 콜백
  onPressSend?: (message: string) => void;

  // 채팅 화면: 이미지 선택됨 콜백 (이번에 고른 URI들을 그대로 전달)
  onAddImages?: (uris: string[]) => void;

  placeholder?: string;
  disabled?: boolean;

  // 아이콘 주입
  heartIconSrc?: any;
  heartIconActiveSrc?: any;
  plusIconSrc?: any;

  bottomInset?: number;

  // 상세 화면: 전송 시 자동 네비 파라미터
  chatAutoNavigateParams?: ChatAutoNavigateParams;

  // 채팅 화면: 이미지 선택 옵션
  imagePickerMax?: number;
  /** 부모에 알린 뒤 내부 버퍼를 비울지 (기본 true) */
  clearPickedAfterNotify?: boolean;

  /** 현재 첨부된 이미지 개수(부모 상태). 0 초과면 텍스트가 비어도 전송버튼 활성화 */
  attachmentsCount?: number;
};

const DetailBottomBar: React.FC<Props> = ({
  variant = 'detail',
  initialLiked = false,
  onToggleLike,
  onPressSend,
  onAddImages,
  placeholder = '메세지를 입력해주세요.',
  disabled = false,
  heartIconSrc = require('../../assets/images/heart.png'),
  heartIconActiveSrc = require('../../assets/images/redheart.png'),
  plusIconSrc = require('../../assets/images/plus_grey.png'),
  bottomInset = 0,
  chatAutoNavigateParams,
  clearPickedAfterNotify = true,
  attachmentsCount = 0,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [liked, setLiked] = useState(initialLiked);
  const [text, setText] = useState('');

  // 훅은 조건부 호출 금지. chat 모드에서만 결과를 사용합니다.
  const { images: pickedImages, setImages: setPickedImages, openAdd, remain } =
    useImagePicker({ max: 10 });

  /** 외부 초기 좋아요 값 변경 시 동기화 */
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  /** ✅ 전송 가능: (텍스트 있거나 첨부가 1개 이상) && 비활성 아님 */
  const canSend = useMemo(
    () => (!!text.trim() || attachmentsCount > 0) && !disabled,
    [text, attachmentsCount, disabled]
  );

  /** (detail) 좋아요 토글 */
  const handleToggleLike = () => {
    const next = !liked;
    setLiked(next);
    onToggleLike?.(next);
  };

  /** (chat) + 버튼 → 이미지 추가 */
  const handlePressPlus = () => {
    if (disabled) return;
    openAdd();
  };

  /** ✅ (chat) 이미지 선택 감지: 선택된 걸 통째로 부모로 전달 → 내부 버퍼 비우기(기본) */
  useEffect(() => {
    if (variant !== 'chat') return;
    if (!pickedImages || pickedImages.length === 0) return;

    // 이번 선택분 전체 전달
    onAddImages?.(pickedImages);

    // 중복 전달 방지: 내부 버퍼 초기화(옵션)
    if (clearPickedAfterNotify) {
      setPickedImages([]);
    }
  }, [pickedImages, variant, onAddImages, clearPickedAfterNotify, setPickedImages]);

  /** 전송 */
  const handlePressSend = () => {
    if (!canSend) return;
    const msg = text.trim();

    if (variant === 'detail') {
      if (!chatAutoNavigateParams) {
        Alert.alert('알림', '채팅방 이동 정보를 찾을 수 없어요.');
      } else {
        navigation.navigate('ChatRoom', {
          ...chatAutoNavigateParams,
          initialMessage: msg,
        });
      }
    } else {
      onPressSend
        ? onPressSend(msg)
        : Alert.alert('알림', '전송 핸들러가 연결되지 않았습니다.');
    }

    setText(''); // 입력 초기화
  };

  /** 좌측 버튼: detail=♥ / chat=＋ */
  const LeftButton = () =>
    variant === 'detail' ? (
      <TouchableOpacity
        onPress={handleToggleLike}
        activeOpacity={0.8}
        style={styles.heartBtn}
        accessibilityRole="button"
        accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
        disabled={disabled}
      >
        <Image
          source={liked ? heartIconActiveSrc : heartIconSrc}
          style={styles.heartIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        onPress={handlePressPlus}
        activeOpacity={0.8}
        style={styles.heartBtn}
        accessibilityRole="button"
        accessibilityLabel="이미지 추가"
        disabled={disabled || remain <= 0}
      >
        <Image source={plusIconSrc} style={styles.heartIcon} resizeMode="contain" />
      </TouchableOpacity>
    );

  return (
    // iOS에서 키보드 올라올 때 바가 살짝 위로 이동
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={styles.kav}
    >
      <View style={[styles.safe, { paddingBottom: bottomInset }]}>
        <View style={[styles.wrap, disabled && { opacity: 0.6 }]}>
          {/* 좌측: detail=하트 / chat=플러스 */}
          <LeftButton />

          {/* 입력 */}
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#A6A6A6"
              value={text}
              onChangeText={setText}
              editable={!disabled}
              returnKeyType="send"
              onSubmitEditing={handlePressSend}
            />
          </View>

          {/* 전송 */}
          <TouchableOpacity
            onPress={handlePressSend}
            activeOpacity={canSend ? 0.9 : 1}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="전송"
          >
            <Text style={styles.sendText}>전송</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default DetailBottomBar;
