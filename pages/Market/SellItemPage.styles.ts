import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    paddingHorizontal: 19,
    paddingTop: 60,
    paddingBottom: 24,
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
    color: '#1E1E1E',
  },

  /* 공통 필드 래퍼 */
  field: {
    marginBottom: 18,
  },

  /* 라벨 (제목/설명/거래방식/거래 희망 장소) */
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 8,
    marginLeft: 5,
  },

  /* 인풋 (단일 라인) */
  input: {
    height: 47,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1E1E1E',
    backgroundColor: '#FFFFFF',
  },
  /* 설명 박스 (멀티라인) */
  textarea: {
    height: 200,
    paddingTop: 12,
    paddingBottom: 12,
  },

  /* 나눔 모드일 때 가격칸 비활성화 스타일 */
  inputDisabled: {
    backgroundColor: '#EAEAEA',
  },

  /* 거래 방식 토글 */
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modeChip: {
    height: 37,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  // 비활성(공통) 외곽선
  modeChipOutline: {
    borderWidth: 1,
    borderColor: '#979797',
    backgroundColor: '#FFFFFF',
  },

  modeChipActiveFill: {
    backgroundColor: '#393A40',
  },
  modeChipText: {
    fontSize: 13,
  },
  modeChipTextDark: {
    color: '#393A40',
    fontWeight: '400',
  },
  modeChipTextLight: {
    color: '#FFFFFF',
    fontWeight: '400',
  },

  /* 하단 버튼 영역 */
  submitWrap: {
    padding: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#EDEDED',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitSpacer: {
    height: 24, // 스크롤 하단 여백
  },
});
