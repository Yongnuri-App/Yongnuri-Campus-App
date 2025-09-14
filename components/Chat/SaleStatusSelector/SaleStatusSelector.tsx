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
import styles from './SaleStatusSelector.styles';

/** 판매 상태 한글 라벨 타입 */
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

  const handleOpen = () => {
    if (readOnly) return;
    setOpen(true);
  };

  const handleSelect = (next: SaleStatusLabel) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  return (
    <View style={style}>
      {/* 본체 버튼 */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.selector}
        onPress={handleOpen}
        disabled={readOnly}
      >
        <Text style={styles.selectorText} numberOfLines={1}>
          {value}
        </Text>

        {/* 아이콘 */}
        <Image
          source={downIcon}
          style={styles.chevronIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* 드롭다운 모달 */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>판매 상태 변경</Text>

          {options.map((opt) => {
            const selected = opt === value;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.optionRow, selected && styles.optionRowSelected]}
                onPress={() => handleSelect(opt)}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {opt}
                </Text>
                <View style={[styles.dot, selected && styles.dotActive]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}
