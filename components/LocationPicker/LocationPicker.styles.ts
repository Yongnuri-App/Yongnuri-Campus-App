// components/SelectField/SelectField.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준(iPhone 13: 390 x 844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 반응형 유틸
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  container: {
    marginBottom: verticalScale(18),
  },
  label: {
    fontSize: fontScale(15),
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: verticalScale(8),
    marginLeft: scale(3),
  },

  // 셀
  selectBox: {
    height: verticalScale(47),
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: scale(6),
    paddingHorizontal: scale(12),
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBoxError: {
    borderColor: '#E85D5D',
  },
  selectPlaceholder: {
    fontSize: fontScale(14),
    color: '#979797',
  },
  selectValue: {
    fontSize: fontScale(14),
    color: '#1E1E1E',
  },
  dropdownIcon: {
    width: scale(23),
    height: scale(23),
    marginLeft: scale(8),
    resizeMode: 'contain',
  },

  // 모달 공통
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    paddingTop: verticalScale(20),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(10),
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  sheetTitle: {
    fontSize: fontScale(18),
    fontWeight: '700',
    color: '#1E1E1E',
  },
  sheetScroll: {
    maxHeight: verticalScale(360),
  },
  sheetContent: {
    paddingVertical: verticalScale(4),
  },

  // 옵션 아이템
  optionItem: {
    height: verticalScale(48),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    backgroundColor: '#F8F9FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  optionItemActive: {
    backgroundColor: '#EAF0FB',
    borderWidth: 1,
    borderColor: '#395884', // 프로젝트 메인톤
  },
  optionLabel: {
    fontSize: fontScale(15),
    color: '#1E1E1E',
  },
  optionLabelActive: {
    color: '#395884',
    fontWeight: '700',
  },
  optionCheck: {
    fontSize: fontScale(18),
    color: '#395884',
    marginLeft: scale(8),
  },

  // 취소 버튼
  cancelBtn: {
    height: verticalScale(48),
    borderRadius: scale(12),
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(15),
  },
  cancelText: {
    color: '#FFF',
    fontSize: fontScale(16),
    fontWeight: '700',
  },
});
