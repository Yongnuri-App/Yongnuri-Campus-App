// components/Chat/SaleStatusSelector/SaleStatusSelector.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 📏 비율 기반 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const COLORS = {
  text: '#1E1E1E',
  bg: '#FFFFFF',
  divider: '#D9D9D9',
  backdrop: 'rgba(0,0,0,0.4)',
};

export default StyleSheet.create({
  /* ===== 셀렉터 버튼 ===== */
  selector: {
    width: scale(80),
    height: verticalScale(30),
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: scale(2),
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(11),
  },
  selectorText: {
    fontSize: fontScale(13),
    fontWeight: '600',
    color: COLORS.text,
  },
  chevronIcon: {
    width: scale(13),
    height: scale(13),
    marginLeft: scale(4),
  },

  /* ===== 모달 ===== */
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: scale(8),
    paddingTop: verticalScale(8),
  },

  /* ===== 옵션 카드 ===== */
  optionCard: {
    borderRadius: scale(12),
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
    marginBottom: verticalScale(8),
  },
  optionBtn: {
    height: verticalScale(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  optionText: {
    fontSize: fontScale(16),
    color: COLORS.text,
  },

  /* ===== 닫기 카드 ===== */
  closeCard: {
    borderRadius: scale(12),
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  closeText: {
    fontWeight: '700',
  },
});
