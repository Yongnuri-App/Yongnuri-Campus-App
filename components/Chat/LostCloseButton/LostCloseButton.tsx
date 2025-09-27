import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, ViewStyle } from 'react-native';
import styles from './LostCloseButton.styles';

/** 심플 2단계 상태: 미해결 ↔ 해결됨(완료) */
export type LostSimpleStatus = 'OPEN' | 'RESOLVED';

type Props = {
  /** 현재 상태 */
  value: LostSimpleStatus;
  /** 완료 처리 콜백(부모에서 훅 handleCloseLost 연결) */
  onClose: () => Promise<void> | void;
  /** 작성자가 아니면 true → 버튼 비활성화 */
  readOnly?: boolean;
  /** 추가 스타일 */
  style?: ViewStyle;
  /** 확인 문구 커스텀 */
  confirmText?: string;
  /** 처리 완료 후 후킹(선택) */
  onClosed?: () => void;
};

/**
 * 분실물 "완료 처리" 단일 버튼
 * - OPEN일 때만 활성화
 * - 클릭 시 확인 모달 → onClose 실행
 * - RESOLVED 상태면 비활성 + "해결됨" 라벨
 */
export default function LostCloseButton({
  value,
  onClose,
  readOnly = false,
  style,
  confirmText,
  onClosed,
}: Props) {
  const [loading, setLoading] = useState(false);

  // 버튼 활성/비활성 조건
  const disabled = readOnly || value === 'RESOLVED' || loading;

  const askConfirm = () => {
    if (disabled) return;

    Alert.alert(
      '완료 처리',
      confirmText ?? '분실물이 주인에게 반환되었나요?\n이후에는 상태를 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '완료하기',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // 부모(onClose)에서 훅 handleCloseLost를 호출 → 상태 업데이트/프리뷰/히스토리 반영
              await onClose();
              onClosed?.();
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={askConfirm}
      disabled={disabled}
      activeOpacity={0.85}
      // 접근성/테스트 편의
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID="lost-close-button"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Text style={styles.text}>
        {value === 'RESOLVED' ? '해결됨' : loading ? '처리 중...' : '완료 처리'}
      </Text>
    </TouchableOpacity>
  );
}
