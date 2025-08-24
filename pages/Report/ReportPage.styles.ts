// pages/Report/ReportPage.styles.ts
import { Platform, StyleSheet } from 'react-native';

export default StyleSheet.create({
  /* ===== 컨테이너 ===== */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    // 피그마 상태바 여백은 헤더 marginTop으로 처리
  },

  /* ===== 헤더 ===== */
  header: {
    height: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
    position: 'relative',
    // ✅ 헤더를 좀 더 아래로
    marginTop: Platform.OS === 'ios' ? 32 : 12,
  },
  backButton: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 18,
    height: 18,
  },
  // 타이틀을 정확히 중앙에 고정
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700', // 좀 더 두껍게
    color: '#1E1E1E',
  },
  // 오른쪽 공간 확보용(아이콘 크기만큼)
  rightSpacer: {
    width: 25,
    height: 25,
  },

  /* ===== 스크롤 ===== */
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24, // 고정 버튼 때문에 실제 여유는 컴포넌트에서 +120
  },

  /* ===== 공통 섹션 ===== */
  section: { marginTop: 16 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 8,
  },

  /* ===== 읽기 전용 박스 (신고 할 유저) ===== */
  readonlyBox: {
    height: 47,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  readonlyText: {
    fontSize: 13,
    color: '#1E1E1E',
  },

  /* ===== 신고 유형 셀렉트 ===== */
  selectBox: {
    height: 47,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectTextPlaceholder: {
    fontSize: 14,
    color: '#979797',
    flex: 1,
    marginRight: 8,
  },
  selectText: {
    fontSize: 14,
    color: '#1E1E1E',
    flex: 1,
    marginRight: 8,
  },
  dropdownIcon: {
    width: 24,
    height: 24,
  },

  /* 드롭다운 메뉴 */
  dim: {
    position: 'absolute',
    left: -18,  // content padding을 상쇄해 전체 덮도록
    right: -18,
    top: -8,
    bottom: 0,
  },
  menu: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: 47 + 8, // selectBox 높이 + 간격
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
    zIndex: 10,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#1E1E1E',
  },
  menuItemTextActive: {
    fontWeight: '700',
    color: '#395884',
  },

  /* ===== 텍스트 영역 ===== */
  textArea: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 14,
    color: '#1E1E1E',
  },

  /* ===== 하단 고정 제출 버튼 ===== */
  fixedSubmitWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    // ✅ 버튼을 약간 더 위로
    bottom: 28,
  },
  submitButton: {
    height: 50,
    borderRadius: 50,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
