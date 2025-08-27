import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' , marginTop: -40},
  statusBar: { height: 44, backgroundColor: '#FFFFFF' },

  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { width: 20, height: 20, resizeMode: 'contain', tintColor: '#1E1E1E' },
  headerTitle: { fontFamily: 'Inter', fontWeight: '600', fontSize: 17, color: '#1E1E1E' },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  /* 빈 상태 */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#979797',
  },
});
