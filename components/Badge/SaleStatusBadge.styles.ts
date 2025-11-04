import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 👉 기준 디바이스(예: iPhone 13/14 폭 390px 기준)
const BASE_WIDTH = 390;

// 스케일 함수 (현재 폭 기준 비율)
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

// 폰트는 PixelRatio로 약간 부드럽게 보정
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

export default StyleSheet.create({
  badge: {
    paddingHorizontal: scale(7),
    height: scale(20),
    borderRadius: scale(5),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(6), // 타이틀 앞 간격
    marginBottom: scale(5),
  },
  text: {
    fontSize: fontScale(11),
    fontWeight: '600',
    color: '#fff',
  },
  // 👇 분실물 배지 톤이랑 맞추고 싶으면 여기 색만 맞추면 됨
  reserved: { backgroundColor: '#2AAF6D' }, // 예약중
  sold: { backgroundColor: '#7D7D7D' },     // 거래완료
});
