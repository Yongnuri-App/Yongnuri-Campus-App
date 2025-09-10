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
    backgroundColor: '#419EBD', // 파랑-민트 느낌(피그마 '모집중'에 맞춤)
  },
  badgeClosed: {
    backgroundColor: '#F070C8', // 분홍 톤(요청 '모집마감')
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
});
