import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 12,
    // ✅ 하단 배지/고정 요소를 위한 기준점
    position: 'relative',
  },

  thumbnail: {
    width: 121,
    height: 121,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
  },
  thumbPlaceholder: {
    backgroundColor: '#E5E7EB',
  },

  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    // ✅ 중고거래 카드와 동일하게 하단 고정요소 공간 확보
    marginBottom: 40,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeBase: {
    minWidth: 32,
    height: 20,
    borderRadius: 5,
    paddingHorizontal: 6,
    backgroundColor: '#419EBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeOpen: {
    backgroundColor: '#419EBD',
  },
  badgeClosed: {
    backgroundColor: '#9B9B9B',
  },
  badgeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  title: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#212124',
  },

  term: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  timeAgo: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // ✅ 중고거래 카드와 동일한 하단 배지 스타일
  bottomTagBox: {
    position: 'absolute',
    left: 137, // 썸네일(121) + 간격(16)
    bottom: 8,
    paddingHorizontal: 10,
    height: 28,
    backgroundColor: '#F2F3F6',
    justifyContent: 'center',
  },
  bottomTagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
