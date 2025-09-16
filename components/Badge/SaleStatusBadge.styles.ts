import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6, // 타이틀 앞 간격
    marginBottom: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  // 👇 분실물 배지 톤이랑 맞추고 싶으면 여기 색만 맞추면 됨
  reserved: { backgroundColor: '#2AAF6D' }, // 예약중
  sold: { backgroundColor: '#7D7D7D' },     // 거래완료
});
