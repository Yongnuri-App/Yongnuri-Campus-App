// components/FullscreenImageViewer/FullscreenImageViewer.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // 피그마(iPhone 13) 기준
const BASE_HEIGHT = 844;

// 반응형 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  footer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerPill: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  footerText: {
    color: '#fff',
    fontSize: fontScale(14),
    fontWeight: '600',
  },
  closeBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: fontScale(14),
    fontWeight: '600',
  },
});
