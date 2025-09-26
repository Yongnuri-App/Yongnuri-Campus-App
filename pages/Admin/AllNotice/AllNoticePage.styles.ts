import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  /* 헤더 */
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { width: 20, height: 20, resizeMode: 'contain' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1E1E1E' },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110, // 플로팅 버튼 여유
  },

  // ✅ 아이템 사이 구분선 (풀블리드)
  separator: {
    height: 0,
    borderTopWidth: 0.5,
    borderColor: '#D9D9D9',
    marginHorizontal: -16, // content padding 상쇄 → 화면 끝까지
  },

  // ✅ 리스트 상/하단 테두리용 구분선 (박스 느낌)
  listEdge: {
    height: 0,
    borderTopWidth: 0.5,
    borderColor: '#D9D9D9',
    marginHorizontal: -16,
  },

  emptyWrap: { paddingTop: 80, alignItems: 'center' },
  emptyText: { color: '#757575', fontSize: 14 },
});
