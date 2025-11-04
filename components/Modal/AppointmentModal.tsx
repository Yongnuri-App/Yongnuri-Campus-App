// components/Appointment/AppointmentModal.tsx
import React, { useState } from 'react';
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

  // ▼ 날짜/시간/장소 시트 상태
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [tempPlace, setTempPlace] = useState<string>('무도대학');

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
            {/* 날짜 */}
            <View style={styles.row}>
              <Text style={styles.label}>날짜</Text>
              <Pressable
                style={styles.valueRowRight}
                onPress={() => {
                  setTempDate(new Date());
                  setDateSheetOpen(true);
                }}
              >
                <Text style={[styles.valueText, !date && styles.placeholderText]}>
                  {date ?? '날짜 선택'}
                </Text>
                <Image
                  source={require('../../assets/images/down2.png')}
                  style={styles.chevron}
                  resizeMode="contain"
                />
              </Pressable>
            </View>

            {/* 시간 */}
            <View style={[styles.row, { marginTop: 12 }]}>
              <Text style={styles.label}>시간</Text>
              <Pressable
                style={styles.valueRowRight}
                onPress={() => {
                  setTempTime(new Date());
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

            {/* 장소 */}
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

          {Platform.OS === 'ios' && <View style={{ height: 6 }} />}
        </View>
      </View>

      {/* ===== 날짜/시간/장소 선택 시트 ===== */}
      <DatePickerSheet
        visible={dateSheetOpen}
        initial={tempDate}
        minDate={new Date()}
        onClose={() => setDateSheetOpen(false)}
        onConfirm={(d) => {
          setDate(formatKoreanDateLabel(d));
          setDateSheetOpen(false);
        }}
      />

      <TimePickerSheet
        visible={timeSheetOpen}
        initial={tempTime}
        onClose={() => setTimeSheetOpen(false)}
        onConfirm={(d) => {
          setTime(formatKoreanTimeLabel(d));
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
