// components/ProfileRow.styles.ts
import { Dimensions, PixelRatio, StyleSheet } from 'react-native';

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
  /** ✅ 상세 페이지들과 동일 스펙 유지 (행 높이 반응형 조정) */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: clamp(vs(53), 46, 64),
  },

  /** ✅ 고정 이미지 썸네일 (반응형 원형 유지) */
  avatar: {
    width: clamp(s(53), 46, 64),
    height: clamp(s(53), 46, 64),
    borderRadius: ms(26.5),
    borderWidth: 1 / PixelRatio.get(),
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },

  /** ✅ 텍스트 컬럼 (간격 자동 조정) */
  profileTextCol: {
    marginLeft: s(9),
    justifyContent: 'center',
    flex: 1,
  },

  /** ✅ 이름 텍스트 */
  profileName: {
    fontSize: ms(16, 0.4),
    fontWeight: '700',
    color: '#1E1E1E',
    lineHeight: ms(23),
  },

  /** ✅ 학과 텍스트 */
  profileDept: {
    fontSize: ms(12, 0.4),
    fontWeight: '400',
    color: '#979797',
    lineHeight: ms(17),
  },
});
