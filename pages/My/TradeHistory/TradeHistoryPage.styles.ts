import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  /* 컨테이너 */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -40,
  },
  statusBar: {
    height: 44,
    backgroundColor: '#FFFFFF',
  },

  /* 헤더 */
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
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
    left: 20,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#1E1E1E',
  },

  /* 카테고리 탭 아래 필터 칩 */
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  chip: {
    minWidth: 54,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInactive: {
    backgroundColor: '#F2F3F6',
  },
  chipActive: {
    backgroundColor: '#2563EB1A', // 연한 파란 배경(10%)
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextInactive: {
    color: '#555',
  },
  chipTextActive: {
    color: '#2563EB',
  },

  /* 스크롤 콘텐츠 */
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  /* 빈 상태 */
  emptyWrap: {
    marginTop: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#1E1E1E',
  },
  emptySub: {
    marginTop: 6,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#979797',
  },
});
