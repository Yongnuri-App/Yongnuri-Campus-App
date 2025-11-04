import { Platform, StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준 (iPhone 13 계열 390x844 권장)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  /**
   * 피그마 스펙을 RN 친화적으로 변환:
   * - height: 86, 상단 보더/그림자
   * - 좌: 하트 24x24, 중: 입력칸(272x39), 우: 전송(55x39)
   * - 절대 위치 대신 flex row로 배치
   */
  kav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // 화면 하단 고정
  },

  safe: {
    backgroundColor: '#FFFFFF',
  },

  wrap: {
    height: verticalScale(80),
    paddingHorizontal: scale(10),
    paddingBottom: verticalScale(15),
    marginTop: verticalScale(10),
    backgroundColor: '#FFFFFF',
    // 상단 그림자 (iOS/안드)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: scale(10),
    ...Platform.select({
      android: { elevation: 6 },
    }),
    flexDirection: 'row',
    alignItems: 'center',
  },

  heartBtn: {
    width: scale(32),
    height: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(1),
    marginRight: scale(8),
  },

  heartIcon: {
    width: scale(28),
    height: scale(28),
  },

  inputBox: {
    flex: 1,
    height: verticalScale(42),
    backgroundColor: '#EDEDED',
    borderRadius: scale(8),
    justifyContent: 'center',
    paddingHorizontal: scale(10),
  },

  input: {
    fontSize: fontScale(15),
    color: '#1E1E1E',
    paddingVertical: 0, // iOS에서 수직 센터 맞춤
  },

  sendBtn: {
    width: scale(55),
    height: verticalScale(42),
    marginLeft: scale(8),
    borderRadius: scale(8),
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendBtnDisabled: {
    backgroundColor: '#9FB0C9',
  },

  sendText: {
    color: '#FFFFFF',
    fontSize: fontScale(16),
    fontWeight: '600',
    lineHeight: fontScale(22),
  },
});
