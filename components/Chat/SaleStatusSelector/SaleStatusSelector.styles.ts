import { StyleSheet } from 'react-native';

const COLORS = {
  text: '#1E1E1E',
  border: '#D9D9D9',
  bg: '#FFFFFF',
  backdrop: 'rgba(0,0,0,0.25)',
  sheetBg: '#FFFFFF',
  dot: '#D9D9D9',
  dotActive: '#1E1E1E',
  selectedBg: '#F5F5F5',
};

export default StyleSheet.create({
  /* ===== 셀렉터 본체 ===== */
  selector: {
    // 피그마: 79×30 / 1px 보더 / 2px 라운드
    width: 79,
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
    backgroundColor: COLORS.bg,

    // 내부 컨텐츠 정렬(텍스트 왼쪽, 아이콘 오른쪽)
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  selectorText: {
    // 피그마: font-size: 11px, weight: 600, line-height: 14px
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
    color: COLORS.text,
    // 좌측 정렬 유지, 오른쪽 아이콘과 간격
    flex: 1,
  },
  chevronIcon: {
    width: 13,   // 필요에 따라 크기 조정
    height: 13,
    marginLeft: 3,
  },

  /* ===== 모달/시트 ===== */
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
  },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 12,
    backgroundColor: COLORS.sheetBg,
    paddingVertical: 10,
    paddingHorizontal: 12,

    // 그림자 (iOS/Android 공통)
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  optionRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  optionRowSelected: {
    backgroundColor: COLORS.selectedBg,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.dot,
  },
  dotActive: {
    backgroundColor: COLORS.dotActive,
  },
});
