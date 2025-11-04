// /components/Chat/MoreMenu.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준 (iPhone 13: 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 반응형 스케일 함수들
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const COLORS = {
  text: '#1E1E1E',
};

export default StyleSheet.create({
  // 기존 ChatRoomPage.styles.ts의 More Menu Modal 섹션 반응형 버전
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: verticalScale(74 + 25 + 8), // 헤더 아래 여백
    paddingRight: scale(8),
  },
  menuBox: {
    width: scale(110),
    backgroundColor: '#fff',
    borderRadius: scale(8),
    overflow: 'hidden',

    // 그림자 반응형 유지
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: scale(8),
    shadowOffset: { width: 0, height: scale(4) },
    elevation: 6,
  },
  menuItem: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
  },
  /** ✅ 아이콘 + 텍스트 가로 정렬 */
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /** ✅ 아이콘 크기 및 여백 */
  menuIcon: {
    width: scale(18),
    height: scale(18),
    marginRight: scale(8),
    resizeMode: 'contain',
  },
  menuItemText: {
    fontSize: fontScale(16),
    fontWeight: '500',
    color: COLORS.text,
  },
  menuDivider: {
    height: verticalScale(1),
    backgroundColor: '#EEE',
  },
});
