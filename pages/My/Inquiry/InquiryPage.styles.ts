import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  statusBar: { height: 44, backgroundColor: '#FFFFFF' },

  /* 헤더 */
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 22,
    color: '#1E1E1E',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#323232',
    resizeMode: 'contain',
  },

  /* 공지 카드 */
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EDEDED',
    borderRadius: 4,
  },
  noticeIcon: {
    width: 24,
    height: 24,
    tintColor: '#979797',
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 18,
    color: '#797979',
  },
});
