// components/TimePicker/PlacePickerSheet.tsx
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from './TimePickerSheet.styles'; // 기존 시트 스타일 재사용

type Props = {
  visible: boolean;
  initial?: string;
  onClose: () => void;
  onConfirm: (place: string) => void;
};

const PLACE_OPTIONS = [
  '무도대학',
  '체육과학대학',
  '문화예술대학',
  'AI바이오융합대학',
  '용오름대학',
  '학생군사교육단',
  '인문사회융합대학',
  '종합체육관',
  '중앙도서관',
  '대학본부',
  '직접 입력',
];

const PlacePickerSheet: React.FC<Props> = ({
  visible,
  initial,
  onClose,
  onConfirm,
}) => {
  const [selected, setSelected] = useState(initial ?? PLACE_OPTIONS[0]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* 오버레이 */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>장소 선택</Text>

          {/* Picker (휠 1열) */}
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={selected}
              onValueChange={(val) => setSelected(val)}
              style={{ width: '100%' }}
            >
              {PLACE_OPTIONS.map((opt) => (
                <Picker.Item key={opt} label={opt} value={opt} />
              ))}
            </Picker>
          </View>

          {/* 확인 버튼 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.confirmBtn}
            onPress={() => onConfirm(selected)}
          >
            <Text style={styles.confirmText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PlacePickerSheet;
