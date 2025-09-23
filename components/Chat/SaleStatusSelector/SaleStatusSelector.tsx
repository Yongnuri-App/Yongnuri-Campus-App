// components/Chat/SaleStatusSelector/SaleStatusSelector.tsx
import React, { useMemo, useState } from 'react';
import {
  Alert,
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

/** 판매 상태 한글 라벨 타입 */
export type SaleStatusLabel = '판매중' | '예약중' | '거래완료';

type Props = {
  /** 현재 선택된 판매 상태 */
  value: SaleStatusLabel;
  /** 상태 변경 콜백(부모에서 상태 보관) */
  onChange: (next: SaleStatusLabel) => void;
  /** 외부 스타일 주입 */
  style?: ViewStyle;
  /** 읽기전용 모드(버튼 비활성) */
  readOnly?: boolean;

  /**
   * ✅ 거래완료 후 실행할 추가 작업(선택)
   * - 예: marketTradeRepo.upsert(...) 호출, 채팅방에 시스템 메시지 남기기, 서버 PATCH 등
   * - 이 컴포넌트는 UI만 담당하고, 실제 비즈니스 로직은 부모에 위임하는 것이 안전함.
   */
  onCompleteTrade?: () => Promise<void> | void;

  /**
   * 거래완료 선택 시 확인 다이얼로그 표시 여부(기본값 true)
   * - 실수 방지용
   */
  confirmOnComplete?: boolean;
};

const downIcon = require('../../../assets/images/down3.png');

export default function SaleStatusSelector({
  value,
  onChange,
  style,
  readOnly = false,
  onCompleteTrade,
  confirmOnComplete = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false); // 거래완료 후속 처리 중 중복 입력 방지

  const options: SaleStatusLabel[] = useMemo(
    () => ['판매중', '예약중', '거래완료'],
    []
  );

  const insets = useSafeAreaInsets();

  /** 내부 공통 변경 처리 */
  const commitChange = async (next: SaleStatusLabel) => {
    // 1) 부모 onChange로 UI/상태 먼저 변경
    onChange(next);

    // 2) 거래완료 추가 작업(선택)
    if (next === '거래완료' && onCompleteTrade) {
      try {
        setBusy(true);
        await onCompleteTrade(); // 부모에서 upsert/API 호출 수행
      } catch (e) {
        // 부모 로직 실패 시 사용자에게 알림(선택 사항)
        Alert.alert('거래완료 처리 실패', '네트워크 상태를 확인하고 다시 시도해주세요.');
      } finally {
        setBusy(false);
      }
    }
  };

  /** 옵션 선택 핸들러 */
  const handleSelect = (next: SaleStatusLabel) => {
    setOpen(false);
    if (next === value) return; // 동일 값이면 무시
    if (readOnly || busy) return; // 읽기전용/처리중이면 무시

    // 거래완료는 실수 방지용으로 한 번 더 확인(옵션)
    if (next === '거래완료' && confirmOnComplete) {
      Alert.alert(
        '거래를 완료하시겠어요?',
        '거래완료로 변경하면 구매자 거래내역에 반영됩니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '완료',
            style: 'destructive',
            onPress: () => { void commitChange(next); },
          },
        ],
      );
      return;
    }

    void commitChange(next);
  };

  return (
    <View style={style}>
      {/* 본체 버튼 */}
      <TouchableOpacity
        style={styles.selector}
        activeOpacity={0.8}
        disabled={readOnly || busy}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="판매 상태 변경"
        testID="sale-status-selector"
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
        {/* 배경 클릭 시 닫힘 */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

        {/* 시트 컨테이너 (안전영역 하단 여백 고려) */}
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
                activeOpacity={0.8}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`${opt}로 변경`}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 닫기 카드 */}
          <View style={styles.closeCard}>
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => setOpen(false)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <Text style={[styles.optionText, styles.closeText]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
