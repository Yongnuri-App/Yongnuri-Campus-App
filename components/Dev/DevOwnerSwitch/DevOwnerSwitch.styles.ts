import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    // 살짝 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  owner: {
    // OWNER 모드일 때 엣지 강조
    borderColor: '#4CAF50',
  },
  guest: {
    // GUEST 모드일 때 엣지 강조
    borderColor: '#FF7043',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666666',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A6A6A6',
  },
});
