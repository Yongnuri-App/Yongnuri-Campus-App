import { Platform, StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 피그마 기준 디바이스 사이즈 (iPhone 13 기준)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 크기 비율 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // 화면 하단 고정
    height: verticalScale(90),
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',

    // 그림자
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: -1 },
        shadowRadius: scale(10),
      },
      android: {
        elevation: 8,
      },
    }),

    // 하단 소프트키/홈바와 겹침 방지
    paddingBottom: Platform.OS === 'android' ? verticalScale(8) : verticalScale(12),
  },

  tab: {
    width: scale(64), // 각 탭의 터치 영역 (여백 포함)
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: scale(29),
    height: scale(29),
    marginBottom: verticalScale(6),
  },

  label: {
    fontFamily: Platform.select({ ios: 'System', android: 'System' }),
    fontWeight: '700',
    fontSize: fontScale(12),
    lineHeight: fontScale(15),
  },

  labelActive: {
    color: '#323232',
  },

  labelInactive: {
    color: '#979797',
  },
});
