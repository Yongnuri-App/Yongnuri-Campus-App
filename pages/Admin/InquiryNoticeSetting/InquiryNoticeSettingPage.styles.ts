import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  statusBar: { height: Platform.select({ ios: 0, android: 0 }) },

  /* 헤더 */
  header: {
    height: 56,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { width: 20, height: 20, resizeMode: 'contain' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1E1E1E' },

  /* 스크롤 컨텐츠 패딩 */
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },

  /* 공지 입력 카드 (피그마 느낌: 연한 회색 박스, 좌측 캠페인 아이콘) */
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
  },
  noticeIcon: { width: 18, height: 18, marginTop: 2 },

  noticeInput: {
    flex: 1,
    marginTop: -6,
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 20,
  },

  /* 하단 버튼 고정 */
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  saveBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
