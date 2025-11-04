// components/PhotoPicker.styles.ts
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
  /** ✅ 전체 컨테이너 */
  container: {
    marginBottom: vs(18),
  },

  /** ✅ 가로 스크롤 한 줄 레이아웃 */
  row: {
    alignItems: 'center',
    paddingRight: s(4),
  },

  /** ✅ ➕ 추가 타일 */
  addTile: {
    width: clamp(s(65), 58, 80),
    height: clamp(s(65), 58, 80),
    borderWidth: 1 / PixelRatio.get(),
    borderColor: '#979797',
    borderRadius: ms(4),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(6),
    marginRight: s(8),
    backgroundColor: '#FFFFFF',
  },
  cameraIcon: {
    width: ms(25),
    height: ms(25),
    resizeMode: 'contain',
    opacity: 0.7,
    marginBottom: vs(3),
  },
  countText: {
    fontSize: ms(10, 0.4),
    lineHeight: ms(12, 0.4),
    color: '#979797',
  },

  /** ✅ 썸네일 */
  thumbWrap: {
    marginRight: s(8),
  },
  thumb: {
    width: clamp(s(65), 58, 80),
    height: clamp(s(65), 58, 80),
    borderRadius: ms(6),
    borderWidth: 1 / PixelRatio.get(),
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },

  /** ✅ X 버튼 (썸네일 내부 고정) */
  removeBtn: {
    position: 'absolute',
    top: s(4),
    right: s(4),
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: '#393A40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeX: {
    color: '#FFFFFF',
    fontSize: ms(14),
    lineHeight: ms(14),
  },
});
