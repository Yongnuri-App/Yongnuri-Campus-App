// components/Chat/DevBox/DevBox.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // iPhone 13 기준
const BASE_HEIGHT = 844;

const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const COLORS = {
  border: '#E5E7EB',
  bg: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  blue: '#395884',
  gray: '#4B5563',
};

export default StyleSheet.create({
  devBox: {
    marginTop: verticalScale(12),
    padding: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(10),
    backgroundColor: COLORS.bg,
  },
  devTitle: {
    fontSize: fontScale(13),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(8),
  },
  row: {
    flexDirection: 'row',
    gap: scale(8),
  },
  btn: {
    flex: 1,
    height: verticalScale(36),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  owner: {
    backgroundColor: COLORS.blue,
  },
  guest: {
    backgroundColor: COLORS.gray,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: fontScale(13),
    fontWeight: '600',
  },
  hint: {
    marginTop: verticalScale(8),
    fontSize: fontScale(12),
    color: COLORS.sub,
  },
});
