import { StyleSheet } from 'react-native';

// ✅ AlarmItem.alarmItem.styles.ts의 EDGE와 반드시 동일하게 유지하세요.
const EDGE = 16;

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: EDGE,
    marginTop: 45,
  },
  backButton: {
    position: 'absolute',
    left: EDGE,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: 32,
  },
  backIcon: { width: 20, height: 20 },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1E1E1E',
    top: 16,
  },

  // ✅ 리스트 좌우 패딩(AlarmItem EDGE와 동일)
  listContent: {

    paddingBottom: 16,
  },
});
