// components/TimePicker/DatePickerSheet.tsx
import DateTimePicker, { AndroidNativeProps, IOSNativeProps } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from './TimePickerSheet.styles'; // 시간 시트와 동일 스타일 재사용

/**
 * 날짜 선택 바텀시트
 * - iOS: display="spinner" → "YYYY년  M월  D일" 3열 휠(스크린샷과 동일)
 * - Android: 기기별로 스피너/캘린더가 다를 수 있음(Expo 표준 동작)
 */
export type DatePickerSheetProps = {
  visible: boolean;
  initial?: Date;               // 초기 날짜(없으면 오늘)
  minDate?: Date;               // 선택 가능한 최소일(옵션)
  maxDate?: Date;               // 선택 가능한 최대일(옵션)
  onClose: () => void;          // 바깥 탭/뒤로가기
  onConfirm: (d: Date) => void; // 확인 버튼
};

const toInit = (d?: Date) => (d ? new Date(d) : new Date());

const DatePickerSheet: React.FC<DatePickerSheetProps> = ({
  visible,
  initial,
  minDate,
  maxDate,
  onClose,
  onConfirm,
}) => {
  const [value, setValue] = useState<Date>(toInit(initial));

  // iOS/Android 공통 prop
  const commonProps: Partial<IOSNativeProps & AndroidNativeProps> = useMemo(
    () => ({
      mode: 'date',
      display: 'spinner',     // iOS: wheel, Android: 스피너(혹은 시스템 기본)
      value,
      onChange: (_, selected) => {
        if (selected) setValue(selected);
      },
      // @ts-ignore: iOS에서만 의미 있음
      locale: 'ko-KR',
      minimumDate: minDate,
      maximumDate: maxDate,
      themeVariant: 'light',
    }),
    [value, minDate, maxDate]
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* 반투명 배경 */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* 하단 바텀시트 */}
      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>날짜 선택</Text>

          <View style={styles.pickerBox}>
            <DateTimePicker {...(commonProps as any)} />
          </View>

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

export default DatePickerSheet;
