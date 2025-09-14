import React, { useMemo, useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './SaleStatusSelector.styles';

export type SaleStatusLabel = '판매중' | '예약중' | '거래완료';

type Props = {
  value: SaleStatusLabel;
  onChange: (next: SaleStatusLabel) => void;
  style?: ViewStyle;
  readOnly?: boolean;
};

const downIcon = require('../../../assets/images/down3.png');

export default function SaleStatusSelector({
  value,
  onChange,
  style,
  readOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const options: SaleStatusLabel[] = useMemo(
    () => ['판매중', '예약중', '거래완료'],
    []
  );

  const insets = useSafeAreaInsets();

  const handleSelect = (next: SaleStatusLabel) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  return (
    <View style={style}>
      {/* 본체 버튼 */}
      <TouchableOpacity
        style={styles.selector}
        activeOpacity={0.8}
        disabled={readOnly}
        onPress={() => setOpen(true)}
      >
        {/* 현재 선택된 상태 텍스트 */}
        <Text style={styles.selectorText}>{value}</Text>

        {/* ▼ 아이콘 */}
        <Image source={downIcon} style={styles.chevronIcon} resizeMode="contain" />
      </TouchableOpacity>

      {/* 하단 액션시트 모달 */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

        <View style={[styles.sheetContainer, { paddingBottom: insets.bottom || 12 }]}>
          {/* 옵션 카드 */}
          <View style={styles.optionCard}>
            {options.map((opt, idx) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionBtn,
                  idx < options.length - 1 && styles.optionDivider,
                ]}
                onPress={() => handleSelect(opt)}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 닫기 카드 */}
          <View style={styles.closeCard}>
            <TouchableOpacity style={styles.optionBtn} onPress={() => setOpen(false)}>
              <Text style={[styles.optionText, styles.closeText]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
