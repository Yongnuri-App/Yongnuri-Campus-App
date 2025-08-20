import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 8,
    marginLeft: 3,
  },

  // 셀
  selectBox: {
    height: 47,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBoxError: {
    borderColor: '#E85D5D',
  },
  selectPlaceholder: {
    fontSize: 14,
    color: '#979797',
  },
  selectValue: {
    fontSize: 14,
    color: '#1E1E1E',
  },
  dropdownIcon: {
    fontSize: 16,
    color: '#979797',
    marginLeft: 8,
  },

  // 모달 공통
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  sheetScroll: {
    maxHeight: 360,
  },
  sheetContent: {
    paddingVertical: 4,
  },

  // 옵션 아이템
  optionItem: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionItemActive: {
    backgroundColor: '#EAF0FB',
    borderWidth: 1,
    borderColor: '#395884', // 프로젝트 메인톤
  },
  optionLabel: {
    fontSize: 15,
    color: '#1E1E1E',
  },
  optionLabelActive: {
    color: '#395884',
    fontWeight: '700',
  },
  optionCheck: {
    fontSize: 18,
    color: '#395884',
    marginLeft: 8,
  },

  // 취소 버튼
  cancelBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  cancelText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
