// components/ListTile/MarketItem/MarketItem.styles.ts
import { StyleSheet, Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마(iPhone 13) 기준
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 반응형 스케일러
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

// 썸네일/간격 상수 (다른 컴포넌트에서 필요하면 가져다 쓸 수 있게 export)
export const THUMB = Math.round(scale(121));
export const GAP = Math.round(scale(16));
const BOTTOM_LEFT = THUMB + GAP; // 하단 배지의 좌측 기준선 (썸네일+간격)

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
    position: 'relative', // ✅ 하단 배지/하트 고정 기준
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
    marginBottom: verticalScale(40), // (유지)
    marginTop: verticalScale(15),
  },

  title: {
    width: scale(216),     // Figma 기준
    height: verticalScale(20),
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(15),
    lineHeight: verticalScale(20),
    color: '#212124',
    marginBottom: verticalScale(3),
  },

  subtitle: {
    width: scale(114),
    height: verticalScale(15),
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(11),
    lineHeight: verticalScale(15),
    color: '#979797',
    marginBottom: verticalScale(5),
  },

  price: {
    width: scale(152),
    height: verticalScale(20),
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: fontScale(16),
    lineHeight: verticalScale(22),
    color: '#000000',
  },

  // ✅ 하트 영역: 카드 **오른쪽 하단** 고정
  likeWrap: {
    position: 'absolute',
    right: scale(12),
    bottom: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIcon: {
    width: scale(16),
    height: scale(16),
    tintColor: '#BBBBBB',
    marginRight: scale(4),
    resizeMode: 'contain',
  },
  likeCount: {
    fontSize: fontScale(11),
    fontWeight: '500',
    color: '#BBBBBB',
  },

  // ✅ 하단 배지: 카드 **왼쪽 하단**(텍스트 시작선) 고정
  bottomTagBox: {
    position: 'absolute',
    left: BOTTOM_LEFT,                 // 썸네일(121) + 간격(16) → 반응형
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

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
