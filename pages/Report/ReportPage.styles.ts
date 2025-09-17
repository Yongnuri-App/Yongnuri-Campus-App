// pages/Report/ReportPage.styles.ts
import { Platform, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default StyleSheet.create({
  /* ===== 컨테이너 ===== */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  rightSpacer: {
    width: 25,
    height: 25,
  },

  /* ===== 스크롤 ===== */
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  contentWithBottom: {
    paddingHorizontal: 18,
    paddingBottom: 140, // 하단 고정 버튼 여유
  },

  /* ===== 공통 섹션 ===== */
  section: { marginTop: 16 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 8,
  },

  /* ===== 읽기 전용 박스 (신고 할 유저, 유형 등) ===== */
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
    left: -18,
    right: -18,
    top: -8,
    bottom: 0,
  },
  menu: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: 55, // selectBox(47) + 여백(8)
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
  readonlyTextArea: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'flex-start',
  },
  readonlyParagraph: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E1E1E',
  },

  /* ===== 사진 썸네일 ===== */
  thumbWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  thumbEmpty: {
    color: '#979797',
    fontSize: 13,
  },

  /* ===== 하단 고정 버튼 ===== */
  fixedSubmitWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
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

  /* ===== 관리자 검토 버튼 영역 ===== */
  reviewActionsWrap: {
    flexDirection: 'row',
    justifyContent: 'center', // 가운데 정렬
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  reviewBtnOutline: {
    flex: 1,
    maxWidth: 177,            // 최대 177, 작은 기기에서 자동 축소
    height: 50,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 6,      // 버튼 사이 간격
  },
  reviewBtnFilled: {
    flex: 1,
    maxWidth: 177,            // 최대 177, 작은 기기에서 자동 축소
    height: 50,
    borderRadius: 50,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,      // 버튼 사이 간격
  },
  reviewBtnTextOutline: {
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#1E1E1E',
  },
  reviewBtnTextFilled: {
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF',
  },

  /* ===== 전체화면 이미지 뷰어 ===== */
  viewerWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFF',
  },
  viewerZoomItem: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  viewerIndicator: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  viewerIndicatorText: {
    color: '#FFF',
    fontSize: 13,
    opacity: 0.9,
  },
});
