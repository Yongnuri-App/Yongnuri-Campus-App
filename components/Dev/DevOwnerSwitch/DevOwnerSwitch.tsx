import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import styles from './DevOwnerSwitch.styles';

/**
 * DEV 전용: 소유자 판별을 강제로 토글하는 스위치
 * - value: null=자동(AUTO, 실제 훅 결과), true=판매자 강제, false=비판매자 강제
 * - onChange: 탭할 때 null → true → false → null 순환
 * - 길게 누르면 즉시 null(AUTO)로 리셋
 */
export type DevOwnerState = boolean | null;

type Props = {
  /** 현재 강제 상태(null=오토, true=판매자, false=게스트) */
  value: DevOwnerState;
  /** 상태 변경 콜백 */
  onChange: (next: DevOwnerState) => void;
  /** 외부 위치/레이아웃 제어용 */
  style?: ViewStyle;
  /** 라벨 커스터마이즈 */
  labels?: { auto: string; owner: string; guest: string };
};

const cycle = (v: DevOwnerState): DevOwnerState => (v === null ? true : v ? false : null);

export default function DevOwnerSwitch({
  value,
  onChange,
  style,
  labels = { auto: 'AUTO', owner: 'OWNER', guest: 'GUEST' },
}: Props) {
  // 표시/색상 결정
  const { text, mode } = useMemo(() => {
    if (value === null) return { text: labels.auto, mode: 'auto' as const };
    if (value === true) return { text: labels.owner, mode: 'owner' as const };
    return { text: labels.guest, mode: 'guest' as const };
  }, [value, labels]);

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        mode === 'owner' && styles.owner,
        mode === 'guest' && styles.guest,
        style,
      ]}
      onPress={() => onChange(cycle(value))}
      onLongPress={() => onChange(null)}            // 길게 눌러 AUTO로 리셋
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="DEV 소유자 강제 토글"
      testID="dev-owner-switch"
    >
      <View style={styles.dot} />
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
}
