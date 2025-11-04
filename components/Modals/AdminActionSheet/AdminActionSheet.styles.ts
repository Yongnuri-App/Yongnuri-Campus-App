import { Dimensions, PixelRatio, Platform, StyleSheet } from 'react-native';

/**
 * ✅ 반응형 스케일 유틸
 * - 기준 디바이스: iPhone 12/13/14 (폭 390, 높이 844)
 * - s: 가로 스케일, vs: 세로 스케일, ms: 완만 스케일(폰트/라운드 등에 추천)
 */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BASE_W = 390;
const BASE_H = 844;

const s = (size: number) => (SCREEN_W / BASE_W) * size;
const vs = (size: number) => (SCREEN_H / BASE_H) * size;
/** clamp로 너무 과도한 확대/축소 방지 */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));
const ms = (size: number, factor = 0.5) => {
  const scaled = size + (s(size) - size) * factor;
  // 작은 폰에서는 너무 작아지지 않게, 큰 폰에서도 과하지 않게 고정
  return clamp(scaled, size * 0.85, size * 1.35);
};

/**
 * ✅ 그림자 프리셋 (iOS/Android 일관)
 */
const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: ms(6),
  shadowOffset: { width: 0, height: s(4) },
  elevation: 2,
};

export default StyleSheet.create({
  /** ✅ 반투명 딤(배경 어둡게) — 전체 화면 안전하게 덮기 */
  dim: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },

  /** ✅ 액션 카드
   * - width/position을 스케일링
   * - 작은 화면에서 터치범위가 너무 작아지지 않도록 최소치 보장
   */
  card: {
    position: 'absolute',
    width: clamp(s(70), 60, 86),
    right: s(12),
    top: vs(83), // 상세 페이지 우상단 아이콘 아래
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1 / PixelRatio.get(),
    borderColor: '#E5E7EB',
    borderRadius: ms(8),
    paddingVertical: ms(6),
    zIndex: 20,

    // ✅ 그림자 (iOS/Android)
    ...shadow,

    // ✅ 모서리 라운딩 안쪽 컨텐츠만 잘리게(그림자에는 영향 없도록 유지)
    overflow: Platform.select({ ios: 'hidden', android: 'hidden' }),
  },

  /** ✅ 항목 버튼 — 터치 영역/여백 반응형 */
  item: {
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    alignSelf: 'stretch',
    alignItems: 'center',
  },

  /** ✅ 항목 텍스트(기본/위험) — 폰트 반응형 */
  itemText: {
    fontSize: ms(15, 0.4),
    color: '#1E1E1E',
    fontWeight: '500',
  },
  itemTextDanger: {
    fontSize: ms(15, 0.4),
    color: '#D32F2F',
    fontWeight: '600',
  },

  /** ✅ 구분선 — 고해상도에서도 1px 유지 */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    alignSelf: 'stretch',
  },
});
