import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import styles from './DetailBottomBar.styles';

type Props = {
  /** 초기 좋아요 상태 (선택) */
  initialLiked?: boolean;
  /** 좋아요 토글 콜백 (상위에 알림, 선택) */
  onToggleLike?: (liked: boolean) => void;
  /** 전송 버튼 눌림 (선택, 미구현 알림 대체) */
  onPressSend?: (message: string) => void;
  /** 플레이스홀더 문구 커스터마이즈 */
  placeholder?: string;
  /** 바깥에서 비활성화하고 싶을 때 */
  disabled?: boolean;
  /** 아이콘 경로가 다를 경우 주입 가능(선택) */
  heartIconSrc?: any;
  heartIconActiveSrc?: any;
  bottomInset?: number; // 하단 안전 영역 여백 (선택, 기본 0)
};

const DetailBottomBar: React.FC<Props> = ({
  initialLiked = false,
  onToggleLike,
  onPressSend,
  placeholder = '메세지를 입력해주세요.',
  disabled = false,
  heartIconSrc = require('../../assets/images/heart.png'),
  heartIconActiveSrc = require('../../assets/images/redheart.png'),
  bottomInset = 0,
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [text, setText] = useState('');

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  const canSend = useMemo(() => !!text.trim() && !disabled, [text, disabled]);

  const handleToggleLike = () => {
    const next = !liked;
    setLiked(next);
    onToggleLike?.(next);
  };

  const handlePressSend = () => {
    if (!canSend) return;
    if (onPressSend) {
      onPressSend(text.trim());
    } else {
      Alert.alert('알림', '채팅 기능은 준비 중입니다.');
    }
    setText('');
  };

  return (
    // 키보드가 올라올 때 바가 살짝 위로 이동하도록 처리
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={styles.kav}
    >
      <View style={[styles.safe, { paddingBottom: bottomInset }]}>
        <View style={[styles.wrap, disabled && { opacity: 0.6 }]}>
          {/* 하트 토글 */}
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

          {/* 입력창 */}
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

          {/* 전송 버튼 */}
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
