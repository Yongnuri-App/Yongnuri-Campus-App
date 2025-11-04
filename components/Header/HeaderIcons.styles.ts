// components/Header/HeaderIcons.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // iPhone 13 피그마 기준
const BASE_HEIGHT = 844;

// 반응형 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: scale(24),
    height: scale(24),
    marginLeft: scale(16),
  },
  badge: {
    position: 'absolute',
    right: scale(-3),
    top: verticalScale(-4),
    backgroundColor: '#E53935',
    borderRadius: scale(8),
    paddingHorizontal: scale(4),
    paddingVertical: verticalScale(2),
  },
  badgeText: {
    fontSize: fontScale(10),
    color: '#fff',
    fontWeight: 'bold',
  },
});
