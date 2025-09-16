import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import styles from './SaleStatusBadge.styles';

// 채팅에서 쓰는 라벨과 동일하게 사용
export type SaleStatusLabel = '판매중' | '예약중' | '거래완료';

type Props = {
  status: SaleStatusLabel;
  style?: ViewStyle;
};

/**
 * SaleStatusBadge
 * - "예약중", "거래완료"에만 렌더링
 * - "판매중"이면 null 반환(표시 안 함)
 * - 분실물의 "분실/습득" 뱃지와 톤을 맞추고 싶으면 색상만 조정
 */
export default function SaleStatusBadge({ status, style }: Props) {
  if (status === '판매중') return null; // 표시하지 않음

  const tone = status === '예약중' ? 'reserved' : 'sold';
  return (
    <View style={[styles.badge, styles[tone], style]}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}
