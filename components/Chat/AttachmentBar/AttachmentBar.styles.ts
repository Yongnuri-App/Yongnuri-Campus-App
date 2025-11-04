import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준 (iPhone 13: 390 x 844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;          // 가로 기준
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size; // 세로 기준
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));                    // 폰트 보정

/**
 * 기존 ChatRoomPage.styles.ts의 attachBar 관련 값 유지
 * - 단, 항상 화면 하단(절대 위치)에 뜨도록 container를 추가
 */
export default StyleSheet.create({
  // 전체를 절대 위치로 띄워서 bottom을 동적으로 제어
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    // bottom은 컴포넌트에서 동적으로 지정
    zIndex: 2,     // 입력바/그림자 위에 표시
    elevation: 2,  // Android
  },

  attachBar: {
    // borderTopWidth: 1,
    // borderTopColor: '#EEE',
    // backgroundColor: '#FFF',
  },

  attachScroll: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
  },

  thumbWrapAttach: {
    width: scale(64),
    height: verticalScale(64),
    borderRadius: scale(8),
    overflow: 'hidden',
    marginRight: scale(8),
    position: 'relative',
    backgroundColor: '#EDEDED',
  },

  thumbAttach: {
    width: '100%',
    height: '100%',
  },

  removeBtn: {
    position: 'absolute',
    right: scale(4),
    top: verticalScale(4),
    width: scale(20),
    height: verticalScale(20),
    borderRadius: scale(10),
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeX: {
    color: '#FFF',
    fontSize: fontScale(14),
    lineHeight: fontScale(14),
    fontWeight: '700',
  },
});
