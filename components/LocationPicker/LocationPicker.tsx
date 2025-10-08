import React, { memo, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import styles from './LocationPicker.styles';

const downIcon = require('../../assets/images/down.png');

type Option = { label: string; value: string };

type Props = {
  /** 선택된 장소 값 (넘기면 컨트롤드, 안 넘기면 언컨트롤드로 동작) */
  value?: string;
  /** 값 변경 콜백 (부모가 저장해야 하면 제공) */
  onChange?: (next: string) => void;
  /** 플레이스홀더 문구 */
  placeholder?: string;
  /** 상단 라벨 (숨기려면 null) */
  label?: string | null;
  /** 오류 보더 표시 */
  hasError?: boolean;
  /** 장소 옵션을 바꾸고 싶을 때만 전달. 미전달 시 내부 목 데이터 사용 */
  options?: Option[];
};

/** 내부 기본 장소 옵션 (목 데이터) */
const DEFAULT_OPTIONS: Option[] = [
  { label: '용인대 정문', value: '용인대 정문' },
  { label: '무도대학', value: '무도대학' },
  { label: '체육과학대학', value: '체육과학대학' },
  { label: 'AI바이오융합대학', value: 'AI바이오융합대학' },
  { label: '문화예술대학', value: '문화예술대학' },
  { label: '인성관', value: '인성관' },
  { label: '학생회관', value: '학생회관' },
  { label: '중앙도서관', value: '중앙도서관' },
  { label: '용오름대학', value: '용오름대학' },
];

const LocationPicker: React.FC<Props> = ({
  value,
  onChange,
  placeholder = '장소를 선택해 주세요.',
  label = '거래 희망 장소',
  hasError = false,
  options,
}) => {
  // 🔒 옵션은 기본값 혹은 외부에서 주입된 값 사용
  const items = useMemo(() => options ?? DEFAULT_OPTIONS, [options]);

  // 🧭 언컨트롤드 모드 지원을 위한 내부 상태
  const [internalValue, setInternalValue] = useState<string>('');
  const selectedValue = value ?? internalValue;

  // 📱 모달 열림/닫힘 관리 (컴포넌트 내부에서 처리)
  const [visible, setVisible] = useState(false);

  /** 셀 탭 → 모달 열기 */
  const open = () => setVisible(true);
  /** 취소/바깥 탭 → 모달 닫기 */
  const close = () => setVisible(false);

  /** 항목 선택 시: 부모에 알리고, 언컨트롤드라면 내부 상태도 세팅 */
  const select = (next: string) => {
    onChange?.(next);
    if (value === undefined) setInternalValue(next);
    close();
  };

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {/* ⬇️ 셀 UI (컴포넌트 내부에서 모달을 열어줌) */}
      <TouchableOpacity activeOpacity={0.8} onPress={open}>
        <View style={[styles.selectBox, hasError && styles.selectBoxError]}>
          <Text
            style={selectedValue ? styles.selectValue : styles.selectPlaceholder}
            numberOfLines={1}
          >
            {selectedValue || placeholder}
          </Text>
          <Image
            source={downIcon}
            style={styles.dropdownIcon}     // 스타일은 아래 styles 파일 참고
            resizeMode="contain"           // 이미지 비율 유지하며 영역에 맞춤
            accessibilityRole="image"
            accessibilityLabel="열기"
          />
        </View>
      </TouchableOpacity>

      {/* 🧩 장소 선택 모달 (바텀시트 느낌) */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={close}
      >
        {/* 반투명 배경: 탭 시 닫기 */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          {/* 바텀 시트 영역 (onPress 전파 방지 위해 View) */}
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>거래 희망 장소 선택</Text>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {items.map((opt) => {
                const active = selectedValue === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => select(opt.value)}
                    style={[styles.optionItem, active && styles.optionItemActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                    {/* 선택 표시(체크) */}
                    {active && <Text style={styles.optionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={close} activeOpacity={0.9}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default memo(LocationPicker);
