// components/Common/FloatingButton/FloatingButton.styles.ts
import { Platform, StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // 피그마(iPhone 13) 기준
const BASE_HEIGHT = 844;

// 반응형 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: scale(20),
    // bottom은 컴포넌트에서 bottomOffset prop으로 주입
    width: scale(97),
    height: verticalScale(45),
    borderRadius: scale(22.5),
    backgroundColor: '#395884',

    alignItems: 'center',
    justifyContent: 'center',

    // 피그마 기준 그림자
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: verticalScale(3) },
        shadowRadius: scale(10),
      },
      android: {
        elevation: 6,
      },
    }),
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    width: scale(14),
    height: scale(14),
    marginRight: scale(5),
  },

  label: {
    fontSize: fontScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});

export default styles;
