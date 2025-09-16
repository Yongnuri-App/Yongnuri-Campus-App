import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, ViewStyle } from 'react-native';
import styles from './LostCloseButton.styles';

/** 심플 2단계 상태: 미해결 ↔ 해결됨(완료) */
export type LostSimpleStatus = 'OPEN' | 'RESOLVED';

type Props = {
  value: LostSimpleStatus;                   // 현재 상태
  onClose: () => Promise<void> | void;      // 완료 처리 콜백(부모에서 상태 set)
  readOnly?: boolean;                        // 작성자가 아니면 true
  style?: ViewStyle;
  confirmText?: string;                      // 확인 문구 커스텀 가능
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
}: Props) {
  const [loading, setLoading] = useState(false);
  const disabled = readOnly || value === 'RESOLVED' || loading;

  const askConfirm = () => {
    if (disabled) return;

    Alert.alert(
      '완료 처리',
      confirmText ?? '분실물이 주인에게 반환되었나요?\n이후에는 상태를 되돌릴 수 없어요.',
      [
        { text: '취소' },
        {
          text: '완료하기',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await onClose(); // ✅ 부모에서 상태 갱신(및 로컬 저장 등)
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
    >
      <Text style={styles.text}>
        {value === 'RESOLVED' ? '해결됨' : loading ? '처리 중...' : '완료 처리'}
      </Text>
    </TouchableOpacity>
  );
}
