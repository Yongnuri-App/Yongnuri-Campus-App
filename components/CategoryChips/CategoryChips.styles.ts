import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 피그마 기준 (iPhone 13 = 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const styles = StyleSheet.create({
  wrapper: {
    // 페이지 수평 여백은 외부에서 containerStyle로 조정 가능
  },

  container: {
    paddingHorizontal: scale(20),
    gap: scale(10), // 칩 간격
  },

  chip: {
    height: verticalScale(37),
    borderRadius: scale(18),
    paddingHorizontal: scale(14), // 텍스트 좌우 여백
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  chipActive: {
    backgroundColor: '#393A40',
  },

  chipInactive: {
    backgroundColor: '#F2F3F6',
  },

  chipText: {
    fontSize: fontScale(15),
    lineHeight: fontScale(20), // 피그마 기준
    fontWeight: '400',
  },

  chipTextActive: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: scale(0.3), height: scale(0.3) },
    textShadowRadius: 0,
  },

  chipTextInactive: {
    color: '#212124',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: scale(0.3), height: scale(0.3) },
    textShadowRadius: 0,
  },
});

export default styles;
