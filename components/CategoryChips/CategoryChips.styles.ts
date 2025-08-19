import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    // 페이지에서 수평 여백 맞출 때 외부에서 containerStyle로 덮어쓸 수 있음
  },
  container: {
    paddingHorizontal: 20,
    // 칩 간격
    gap: 10,
  },
  chip: {
    height: 37,
    borderRadius: 18,
    paddingHorizontal: 14, // 텍스트 좌우 여백
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  chipActive: {
    backgroundColor: '#393A40',
  },
  chipInactive: {
    backgroundColor: '#F2F3F6',
  },
  chipText: {
    fontSize: 15,
    lineHeight: 20, // 피그마 기준
    fontWeight: '400',
  },
  chipTextActive: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0.3, height: 0.3 },
    textShadowRadius: 0,
  },
  chipTextInactive: {
    color: '#212124',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0.3, height: 0.3 },
    textShadowRadius: 0,
  },
});

export default styles;
