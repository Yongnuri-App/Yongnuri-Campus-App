// components/ListTile/GroupBuyItem/GroupBuyItem.styles.ts
import { StyleSheet, Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준(iPhone 13: 390 x 844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 반응형 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

// 썸네일 + 간격 (좌측 하단 배지 위치 계산용)
export const THUMB = Math.round(scale(121));
export const GAP = Math.round(scale(16));
const LEFT_OFFSET = THUMB + GAP; // left: 137 기준 → 반응형 계산

export default StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(6),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: scale(4),
    shadowOffset: { width: 0, height: verticalScale(2) },
    ...Platform.select({ android: { elevation: 2 } }),
    marginBottom: verticalScale(12),
    position: 'relative', // ✅ 하단 배지/고정 요소 기준점
  },

  thumbnail: {
    width: THUMB,
    height: verticalScale(121),
    borderRadius: scale(6),
    backgroundColor: '#D9D9D9',
  },
  thumbPlaceholder: {
    backgroundColor: '#E5E7EB',
  },

  info: {
    flex: 1,
    marginLeft: GAP,
    justifyContent: 'center',
    marginBottom: verticalScale(40), // ✅ 중고거래 카드와 동일한 하단 여백
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },

  // 배지
  badgeBase: {
    minWidth: scale(32),
    height: verticalScale(20),
    borderRadius: scale(5),
    paddingHorizontal: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  badgeOpen: {
    backgroundColor: '#419EBD', // 모집중(파랑)
  },
  badgeClosed: {
    backgroundColor: '#9B9B9B', // 모집완료(회색)
  },
  badgeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(10),
    lineHeight: verticalScale(15),
    color: '#FFFFFF',
    textAlign: 'center',
  },

  title: {
    flexShrink: 1,
    fontSize: fontScale(16),
    fontWeight: '700',
    color: '#212124',
  },

  term: {
    marginTop: verticalScale(2),
    fontSize: fontScale(12),
    fontWeight: '500',
    color: '#6B7280',
  },

  timeAgo: {
    marginTop: verticalScale(4),
    fontSize: fontScale(12),
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // ✅ 하단 배지 (텍스트 시작선 고정)
  bottomTagBox: {
    position: 'absolute',
    left: LEFT_OFFSET, // 썸네일(121) + 간격(16)
    bottom: verticalScale(8),
    paddingHorizontal: scale(10),
    height: verticalScale(28),
    backgroundColor: '#F2F3F6',
    justifyContent: 'center',
  },
  bottomTagText: {
    fontSize: fontScale(12),
    color: '#6B7280',
    fontWeight: '600',
  },
});
