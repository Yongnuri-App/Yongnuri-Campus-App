import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준 (iPhone 13: 390×844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 스케일 함수들
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const COLORS = {
  primary: '#395884',
  textOnPrimary: '#FFFFFF',
  disabledBg: '#979797',
  disabledText: '#9CA3AF',
};

export default StyleSheet.create({
  button: {
    width: scale(70),
    height: verticalScale(30),
    paddingHorizontal: scale(12),
    borderRadius: scale(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabledBg,
  },
  text: {
    fontSize: fontScale(13),
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
});
