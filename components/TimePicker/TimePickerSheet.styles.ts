// components/Modal/TimePickerSheet.styles.ts
import { Dimensions, StyleSheet } from 'react-native';

/**
 * ✅ 반응형 스케일 유틸
 * 기준: iPhone 12 (390x844)
 */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BASE_W = 390;
const BASE_H = 844;

const s = (size: number) => (SCREEN_W / BASE_W) * size;
const vs = (size: number) => (SCREEN_H / BASE_H) * size;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));
const ms = (size: number, factor = 0.5) => {
  const scaled = size + (s(size) - size) * factor;
  return clamp(scaled, size * 0.85, size * 1.3);
};

export default StyleSheet.create({
  /** ✅ 어두운 배경 */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  /** ✅ 시트 전체 래퍼 */
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: s(16),
  },

  /** ✅ 시트 본체 */
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: ms(14),
    paddingTop: vs(16),
    paddingBottom: vs(12),
    paddingHorizontal: s(16),

    // 그림자 (iOS/Android)
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: ms(6),
    shadowOffset: { width: 0, height: s(4) },
    elevation: 3,
  },

  /** ✅ 시트 제목 */
  sheetTitle: {
    fontSize: ms(16, 0.4),
    fontWeight: '700',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: vs(8),
  },

  /** ✅ 피커 영역 */
  pickerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(8),
  },

  /** ✅ 확인 버튼 */
  confirmBtn: {
    marginTop: vs(8),
    height: clamp(vs(50), 44, 60),
    borderRadius: ms(10),
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /** ✅ 확인 버튼 텍스트 */
  confirmText: {
    color: '#FFFFFF',
    fontSize: ms(15, 0.4),
    fontWeight: '700',
  },
});
