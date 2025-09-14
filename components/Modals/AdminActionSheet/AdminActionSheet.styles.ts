// components/Modals/AdminActionSheet/AdminActionSheet.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  dim: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
  },
  card: {
    position: 'absolute',
    right: 12,
    top: 83, // 상세 페이지 우상단 아이콘 아래
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 20,
  },
  item: { paddingVertical: 10, paddingHorizontal: 12 },
  itemText: { fontSize: 14, color: '#1E1E1E' },
  itemTextDanger: { fontSize: 14, color: '#D32F2F', fontWeight: '700' },
});
