// components/ListTile/LostItem/LostItem.styles.ts
import { StyleSheet, Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // 피그마(iPhone 13) 기준
const BASE_HEIGHT = 844;

// 반응형 유틸 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export const THUMB = Math.round(scale(121));
export const GAP = Math.round(scale(16));

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(8),
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowRadius: scale(6),
    ...Platform.select({ android: { elevation: 1 } }),
    marginBottom: verticalScale(12),
    position: 'relative', // ✅ bottomTag 기준
  },

  thumbnail: {
    width: THUMB,
    height: verticalScale(121),
    borderRadius: scale(6),
    backgroundColor: '#D9D9D9',
  },

  info: {
    flex: 1,
    marginLeft: GAP,
    justifyContent: 'center',
    marginBottom: verticalScale(60),
    marginTop: verticalScale(15),
  },

  title: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(15),
    lineHeight: verticalScale(20),
    color: '#212124',
    marginLeft: scale(6),
  },

  subtitle: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(11),
    lineHeight: verticalScale(15),
    color: '#979797',
    marginTop: verticalScale(4),
  },

  // ✅ 분실/습득/회수 배지
  badge: {
    minWidth: scale(32),
    height: verticalScale(20),
    borderRadius: scale(5),
    paddingHorizontal: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLost: { backgroundColor: '#F070C8' },
  badgeFound: { backgroundColor: '#419EBD' },
  badgeRetrieved: { backgroundColor: '#979797' },

  badgeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '600',
    fontSize: fontScale(11),
    lineHeight: verticalScale(15),
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // ✅ 좋아요 영역 (오른쪽 하단 고정)
  likeWrap: {
    position: 'absolute',
    right: scale(12),
    bottom: verticalScale(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIcon: {
    width: scale(16),
    height: scale(16),
    marginRight: scale(4),
    resizeMode: 'contain',
    tintColor: '#BBBBBB',
  },
  likeCount: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(12),
    lineHeight: verticalScale(16),
    color: '#BBBBBB',
  },

  // ✅ 카드 내부 하단 배지 (절대 배치)
  bottomTagBox: {
    position: 'absolute',
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

export default styles;
