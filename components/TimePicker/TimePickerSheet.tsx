// components/Modal/TimePickerSheet.tsx
import DateTimePicker, { AndroidNativeProps, IOSNativeProps } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from './TimePickerSheet.styles';

/**
 * 하단에서 올라오는 시간 선택 시트
 * - iOS: display="spinner"로 3열(오전/오후, 시, 분) 휠
 * - Android: display="spinner"로 가능하면 스피너 표시(기기별 시계 UI일 수도 있음)
 * - 확인 버튼을 눌렀을 때 onConfirm로 Date 객체 전달
 */
export type TimePickerSheetProps = {
  visible: boolean;
  initial?: Date;               // 초기 시간(미지정 시 현재)
  onClose: () => void;          // 바깥 탭/닫기
  onConfirm: (d: Date) => void; // 확인
};

const toInit = (d?: Date) => (d ? new Date(d) : new Date());

const TimePickerSheet: React.FC<TimePickerSheetProps> = ({ visible, initial, onClose, onConfirm }) => {
  const [value, setValue] = useState<Date>(toInit(initial));

  // iOS / Android 공통 prop 준비
  const commonProps: Partial<IOSNativeProps & AndroidNativeProps> = useMemo(
    () => ({
      mode: 'time',
      display: 'spinner',      // iOS: wheel, Android: 스피너(기기마다 다를 수 있음)
      value,
      is24Hour: false,         // 12시간제(오전/오후)
      minuteInterval: 5,       // 5분 간격 (iOS에서 적용됨)
      onChange: (_, selected) => {
        if (selected) setValue(selected);
      },
      // @ts-ignore: locale은 iOS에서만 의미 있음
      locale: 'ko-KR',
      themeVariant: 'light',
    }),
    [value]
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* 반투명 배경 */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* 하단 바텀시트 */}
      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>시간 선택</Text>

          {/* 네이티브 스피너 */}
          <View style={styles.pickerBox}>
            <DateTimePicker {...(commonProps as any)} />
          </View>

          {/* 확인 버튼 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.confirmBtn}
            onPress={() => onConfirm(value)}
          >
            <Text style={styles.confirmText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TimePickerSheet;
