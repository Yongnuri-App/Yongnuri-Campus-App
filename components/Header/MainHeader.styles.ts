// components/Header/AppHeader.styles.ts
import { StyleSheet, Dimensions, PixelRatio, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // 피그마(iPhone 13) 기준
const BASE_HEIGHT = 844;

// 반응형 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: Platform.select({
      ios: verticalScale(50), // iPhone notch 고려
      android: StatusBar.currentHeight ? StatusBar.currentHeight + verticalScale(10) : verticalScale(10),
    }),
    paddingBottom: verticalScale(10),
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: scale(40),
    height: scale(40),
    marginRight: scale(8),
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: fontScale(18),
    fontWeight: '700',
    color: '#395884',
  },
});

export default styles;
