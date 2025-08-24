import { StyleSheet } from 'react-native';

export const COLORS = {
  bg: '#FFFFFF',
  text: '#1E1E1E',
  subText: '#797979',
  placeholder: '#979797',
  border: '#979797',
  primary: '#395884',
  chipText: '#393A40',
  chipBg: '#EAEAEA',
  headerDivider: '#E5E5E5',
};

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  inner: {
    paddingHorizontal: 19,
    paddingTop: 60,
    paddingBottom: 24, // 본문 하단 여백 (버튼 공간은 submitWrap이 담당)
  },

  scroll: {
    flex: 1,
  },

  /* ===== Header ===== */
  header: {
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    paddingVertical: 6,
    paddingRight: 6,
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },

  /* ===== Sections ===== */
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 3,
  },

  card: {
    minHeight: 200,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 47,
    fontSize: 14,
    color: COLORS.text,
  },
  multiline: {
    minHeight: 200,
    paddingTop: 12,
    paddingBottom: 12,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },

  /** 칩: 공통(비활성) - 흰배경 + 보더 */
  chipOutline: {
    minWidth: 90,
    height: 37,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /** 칩: 활성 - 어두운 배경(#393A40) */
  chipFilledDark: {
    backgroundColor: COLORS.chipText,
    borderWidth: 0,
  },

  /** 칩 텍스트: 비활성(어두운 회색) */
  chipTextDark: {
    fontSize: 13,
    color: COLORS.chipText,
  },

  /** 칩 텍스트: 활성(흰색) */
  chipTextLight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /** 인원 입력 */
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  countInputBase: {
    width: 136,
    height: 37,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  /** 인원 제한 활성: 흰 배경 */
  countInputActive: {
    backgroundColor: '#FFFFFF',
  },
  /** 비활성: 회색 배경 + 투명도 */
  countInputDisabled: {
    backgroundColor: COLORS.chipBg, // #EAEAEA
    // opacity: 0.5,
  },
  countSuffix: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.placeholder,
  },

  /* ===== 하단 고정 버튼 래퍼 (Sell/Lost와 동일 UX) ===== */
  submitWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: 4, // iOS 홈 인디케이터 고려 여유
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  /* 버튼 자체 모양은 기존 정의 그대로 사용 */
  submitButton: {
    height: 50,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },

  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
