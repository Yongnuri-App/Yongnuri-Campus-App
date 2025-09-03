// components/Appointment/AppointmentModal.tsx
import React, { useMemo, useState } from 'react';
import {
    Image,
    Modal,
    Platform,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import DatePickerSheet from '../TimePicker/DatePickerSheet';
import PlacePickerSheet from '../TimePicker/PlacePickerSheet';
import TimePickerSheet from '../TimePicker/TimePickerSheet';
import styles from './AppointmentModal.styles';

/**
 * 약속잡기 모달 Props
 * - visible: 모달 표시 여부
 * - partnerNickname: "닉네임님과의 약속" 문구에 들어갈 닉네임
 * - onClose: 닫기(X) 또는 바깥 영역 터치 시 호출
 * - onSubmit: 작성완료 버튼 클릭 시 선택 결과 전달
 * - initialDate/time/place: 초기 플레이스홀더/선택값 지정 가능
 */
export type AppointmentModalProps = {
  visible: boolean;
  partnerNickname: string;
  onClose: () => void;
  onSubmit: (payload: { date?: string; time?: string; place?: string }) => void;
  initialDate?: string;
  initialTime?: string;
  initialPlace?: string;
};

const PRIMARY = '#395884';

// 날짜 포맷: "2025년 8월 27일"
const formatKoreanDateLabel = (d: Date) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;


// 시간 포맷 : "오전 10시 30분"
const formatKoreanTimeLabel = (d: Date) => {
  const h24 = d.getHours();
  const m = d.getMinutes();
  const ampm = h24 < 12 ? '오전' : '오후';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${ampm} ${h12}시 ${String(m).padStart(2, '0')}분`;
};

/**
 * 주의:
 * - 날짜/장소는 임시 토글 셀렉터 사용
 * - 시간은 TimePickerSheet(휠 스피너) 사용
 */
const AppointmentModal: React.FC<AppointmentModalProps> = ({
  visible,
  partnerNickname,
  onClose,
  onSubmit,
  initialDate,
  initialTime,
  initialPlace,
}) => {
  // 선택 상태 (미선택 시 placeholder 회색 텍스트가 보이도록 undefined 허용)
  const [date, setDate] = useState<string | undefined>(initialDate);
  const [time, setTime] = useState<string | undefined>(initialTime);
  const [place, setPlace] = useState<string | undefined>(initialPlace);

  // ▼ 날짜/시간 휠 시트 상태
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [tempPlace, setTempPlace] = useState<string>('무도대학');

  // 장소만 임시 옵션 유지
  const placeOptions = useMemo(
    () => ['정문 앞', '도서관 1층 로비', '학생회관 카페', '체육관 입구'],
    []
  );

  /** 공통: 간단한 토글 선택 UI (임시)
   *  - 실제 구현에서는 ActionSheet/BottomSheet, DatePicker 등으로 교체
   */
  const SimpleSelector: React.FC<{
    value?: string;
    placeholder: string;
    options: string[];
    onChange: (v: string) => void;
  }> = ({ value, placeholder, options, onChange }) => {
    const [open, setOpen] = useState(false);
    return (
      <View>
        {/* 선택 행 */}
        <Pressable style={styles.valueRowRight} onPress={() => setOpen(o => !o)}>
          <Text style={[styles.valueText, !value && styles.placeholderText]}>
            {value ?? placeholder}
          </Text>
          <Image
            source={require('../../assets/images/down2.png')}
            style={styles.chevron}
            resizeMode="contain"
          />
        </Pressable>

        {/* 임시 드롭다운 박스 */}
        {open && (
          <View style={styles.dropdown}>
            {options.map(opt => (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
              >
                <Text style={styles.dropdownItemText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* 반투명 오버레이 */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* 중앙 카드 */}
      <View style={styles.cardWrap} pointerEvents="box-none">
        <View style={styles.card}>
          {/* 닫기 버튼 (우상단) */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.9}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Image
              source={require('../../assets/images/close.png')}
              style={styles.closeIcon}
            />
          </TouchableOpacity>

          {/* 타이틀 */}
          <Text style={styles.titleText}>
            {partnerNickname}
            <Text style={{ fontWeight: '700' }}>님과의 약속</Text>
          </Text>

          {/* 날짜/시간/장소 블록 */}
          <View style={styles.formGroup}>
            {/* 라벨 + 값 (날짜) */}
            <View style={styles.row}>
              <Text style={styles.label}>날짜</Text>
              <Pressable
                style={styles.valueRowRight}
                onPress={() => {
                  setTempDate(new Date()); // 필요시 최근 선택값 유지 로직으로 바꿔도 됨
                  setDateSheetOpen(true);
                }}
              >
                <Text style={[styles.valueText, !date && styles.placeholderText]}>
                  {date ?? '날짜 선택'}
                </Text>
                <Image source={require('../../assets/images/down2.png')} style={styles.chevron} resizeMode="contain" />
              </Pressable>
            </View>

            {/* 라벨 + 값 (시간) ——— 변경 포인트: 휠 스피너 시트 연동 */}
            <View style={[styles.row, { marginTop: 12 }]}>
              <Text style={styles.label}>시간</Text>
              <Pressable
                style={styles.valueRowRight}
                onPress={() => {
                  setTempTime(new Date()); // 필요 시 최근 선택값 보관 로직으로 교체 가능
                  setTimeSheetOpen(true);
                }}
              >
                <Text style={[styles.valueText, !time && styles.placeholderText]}>
                  {time ?? '시간 선택'}
                </Text>
                <Image
                  source={require('../../assets/images/down2.png')}
                  style={styles.chevron}
                  resizeMode="contain"
                />
              </Pressable>
            </View>

            {/* 라벨 + 값 (장소) */}
            <View style={[styles.row, { marginTop: 12 }]}>
              <Text style={styles.label}>장소</Text>
              <Pressable
                style={styles.valueRowRight}
                onPress={() => {
                  setTempPlace(place ?? '무도대학');
                  setPlaceSheetOpen(true);
                }}
              >
                <Text style={[styles.valueText, !place && styles.placeholderText]}>
                  {place ?? '장소 선택'}
                </Text>
                <Image
                  source={require('../../assets/images/down2.png')}
                  style={styles.chevron}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </View>

          {/* 작성완료 버튼 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.submitBtn, (!date || !time || !place) && styles.submitBtnDisabled]}
            onPress={() => onSubmit({ date, time, place })}
            disabled={!date || !time || !place}
          >
            <Text style={styles.submitText}>완료</Text>
          </TouchableOpacity>

          {/* iOS 하단 안전영역 여백 보정(필요 시) */}
          {Platform.OS === 'ios' && <View style={{ height: 6 }} />}
        </View>
      </View>

      {/* ===== 날짜/시간 선택 시트 ===== */}
      <DatePickerSheet
        visible={dateSheetOpen}
        initial={tempDate}
        minDate={new Date()}           // 오늘 이전 비활성
        onClose={() => setDateSheetOpen(false)}
        onConfirm={(d) => {
          setDate(formatKoreanDateLabel(d)); // "2025년 8월 27일"
          setDateSheetOpen(false);
        }}
      />

      <TimePickerSheet
        visible={timeSheetOpen}
        initial={tempTime}
        onClose={() => setTimeSheetOpen(false)}
        onConfirm={(d) => {
          setTime(formatKoreanTimeLabel(d)); // "오후 5시 30분"
          setTimeSheetOpen(false);
        }}
      />

      <PlacePickerSheet
        visible={placeSheetOpen}
        initial={tempPlace}
        onClose={() => setPlaceSheetOpen(false)}
        onConfirm={(val) => {
          setPlace(val);
          setPlaceSheetOpen(false);
        }}
      />
    </Modal>
  );
};


export default AppointmentModal;
