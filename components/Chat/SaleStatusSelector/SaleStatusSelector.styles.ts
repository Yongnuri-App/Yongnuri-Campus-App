import { StyleSheet } from 'react-native';

const COLORS = {
  text: '#1E1E1E',
  bg: '#FFFFFF',
  divider: '#D9D9D9',
  backdrop: 'rgba(0,0,0,0.4)',
};

export default StyleSheet.create({
  /* ===== 셀렉터 버튼 ===== */
  selector: {
    width: 80,
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 2,
    backgroundColor: COLORS.bg,
    flexDirection: 'row',       // 텍스트 + 아이콘 가로 정렬
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  chevronIcon: {
    width: 13,
    height: 13,
    marginLeft: 4,
  },

  /* ===== 모달 ===== */
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
  },

  /* ===== 옵션 카드 ===== */
  optionCard: {
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
    marginBottom: 8,
  },
  optionBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },

  /* ===== 닫기 카드 ===== */
  closeCard: {
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  closeText: {
    fontWeight: '700',
  },
});
