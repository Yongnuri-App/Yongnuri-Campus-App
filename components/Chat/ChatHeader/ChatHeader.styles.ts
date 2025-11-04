// /components/Chat/ChatHeader/ChatHeader.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준 (iPhone 13: 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const COLORS = {
  bg: '#FFFFFF',
  text: '#1E1E1E',
  subText: '#979797',
  border: '#D9D9D9',
};

export default StyleSheet.create({
  /** 전체 래퍼: 상단 헤더 + 헤더 아래 카드 포함 */
  wrap: {
    backgroundColor: COLORS.bg,
  },

  // ===== 기존 헤더 영역 =====
  header: {
    height: verticalScale(74 + 25),
    paddingTop: verticalScale(74),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    position: 'absolute',
    left: scale(16),
    top: verticalScale(74),
    width: scale(25),
    height: verticalScale(25),
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    position: 'absolute',
    right: scale(16),
    top: verticalScale(74),
    width: scale(25),
    height: verticalScale(25),
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: scale(20),
    height: scale(20),
    resizeMode: 'contain',
  },
  icon_more: {
    width: scale(25),
    height: scale(25),
    resizeMode: 'contain',
  },
  headerTitle: {
    marginTop: verticalScale(2),
    fontSize: fontScale(20),
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: scale(200),
  },

  // ===== 헤더 하단: 게시글 요약 카드 =====
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(27),
    paddingVertical: verticalScale(14),
    backgroundColor: COLORS.bg,
  },
  thumbWrap: { marginRight: scale(8) },
  thumb: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(4),
  },
  thumbPlaceholder: {
    backgroundColor: COLORS.border,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
  },
  postTitle: {
    fontSize: fontScale(16),
    fontWeight: '500',
    color: COLORS.text,
    paddingBottom: verticalScale(5),
  },

  // ===== 부가 정보 (가격 / 배지 / 위치 / 모집인원) =====
  price: {
    fontSize: fontScale(16),
    fontWeight: '600',
    color: COLORS.text,
  },
  groupBuyLabel: {
    fontSize: fontScale(15),
    fontWeight: '700',
    color: COLORS.text,
  },
  badgeBase: {
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(4),
    borderRadius: scale(4),
    marginRight: scale(6),
  },
  badgeLost: {
    backgroundColor: '#F070C8',
  },
  badgeFound: {
    backgroundColor: '#419EBD',
  },
  badgeText: {
    fontSize: fontScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeText: {
    fontSize: fontScale(15),
    fontWeight: '700',
    color: '#393A40',
  },
});
