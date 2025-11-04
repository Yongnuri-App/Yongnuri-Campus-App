// components/Chat/StatusPill/StatusPill.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // iPhone 13 기준
const BASE_HEIGHT = 844;

const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(999),
    borderWidth: 1,
    borderColor: '#D9D9D9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(4),
    elevation: 2,
    gap: scale(6),
  },
  owner: {
    borderColor: '#4CAF50', // OWNER 강조
  },
  guest: {
    borderColor: '#FF7043', // GUEST 강조
  },
  text: {
    fontSize: fontScale(11),
    fontWeight: '700',
    color: '#666666',
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#A6A6A6',
  },
});
