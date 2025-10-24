// pages/Admin/ReportManage/AdminReportManagePage.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // 피그마 StatusBar 영역(높이 51px 근사치)
  statusBar: {
    height: 45,
    backgroundColor: '#FFFFFF',
  },

  // 상단 헤더
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#1E1E1E',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600', // ✅ 문자열로 수정
    fontSize: 17,
    lineHeight: 22,
    color: '#1E1E1E',
    textAlign: 'center',
  },
  rightSpacer: { width: 24, height: 24 },

  // 목록 컨테이너
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // 각 행
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  rowTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  nickname: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600', // ✅ 문자열로 수정
    color: '#1E1E1E',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },

  // 상태 배지
  statusBadge: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700', // ✅ 문자열로 수정
    color: '#FFFFFF',
  },
  badgeApproved: { backgroundColor: '#395884' }, // 인정
  badgeRejected: { backgroundColor: '#D32F2F' }, // 미인정(레드)

  rowArrow: {
    width: 20,
    height: 20,
    opacity: 0.8,
  },

  // 비어있는 상태
  emptyContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#979797',
  },

  // 하단 핸들
  bottomHandleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  bottomHandle: {
    width: 108,
    height: 4,
    backgroundColor: '#202124',
    borderRadius: 12,
    opacity: 0.9,
  },

  typePill: {
    fontSize: 12,
    color: '#8B8B8B',
  },
});
