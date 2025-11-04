import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준 (iPhone 13 = 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 가로 비율
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
// 세로 비율
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
// 폰트 비율
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },

  bottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDED',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  tab: {
    height: verticalScale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontFamily: 'Inter',
    fontSize: fontScale(15),
    fontWeight: '700',
  },

  labelActive: {
    // 활성 텍스트는 기본 weight 유지
  },

  underline: {
    height: verticalScale(2),
    borderRadius: scale(2),
    marginTop: verticalScale(2),
  },
});
