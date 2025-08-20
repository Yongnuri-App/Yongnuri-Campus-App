// pages/LostAndFound/LostPostCreatePage.styles.ts
import { StyleSheet } from 'react-native';

/**
 * 색상 팔레트 (프로젝트 공통 톤과 피그마 반영)
 */
const COLORS = {
  bg: '#FFFFFF',
  text: '#1E1E1E',
  subText: '#797979',
  placeholder: '#979797',
  border: '#979797',
  primary: '#395884',      // 버튼 색
  chipText: '#393A40',     // 비활성 칩 텍스트
};

export default StyleSheet.create({
  /* ===== 전체 컨테이너 ===== */
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /**
   * inner: 화면 공통 좌우/상하 여백
   * - 상단 패딩은 notch 고려(필요 시 SafeAreaView로 대체 가능)
   */
  inner: {
    flex: 1,
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
    bottom: 12, // 시각적으로 중앙에 오도록 약간 내림
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },

  /* ===== Scroll Content ===== */
  // 스크롤 내용의 하단 여백(고정 버튼 높이만큼은 submitSpacer로 확보)
  scrollContent: {
    paddingBottom: 8,
  },

  /* ===== 공통 블록/텍스트 ===== */
  block: {
    marginBottom: 20,
    paddingHorizontal: 1, // 아주 미세한 좌우 보정(라벨/인풋 정렬 안정화)
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 3,
  },
  helper: {
    fontSize: 12,
    color: COLORS.subText,
    marginBottom: 10,
    marginLeft: 3,
  },

  /* ===== Photo ===== */
  photoCountText: {
    marginTop: 8,
    fontSize: 10,
    color: COLORS.placeholder,
  },

  /* ===== Chips (분실/습득) ===== */
  chipRow: {
    flexDirection: 'row',
    gap: 12, // RN 0.71+ 지원. 레거시 호환 필요 시 marginRight로 대체
  },
  chip: {
    minWidth: 64,
    height: 37,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.text, // 피그마 어두운 배경 톤
    borderColor: COLORS.text,
  },
  chipText: {
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0.3, height: 0.3 },
    textShadowRadius: 0,
  },
  chipTextInactive: {
    color: COLORS.chipText,
    fontWeight: '400',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '400',
  },

  /* ===== Inputs ===== */
  inputBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    height: 47,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    fontSize: 14,
    color: COLORS.text,
  },
  textareaBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    height: 200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  textarea: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },

  /* ===== 하단 여백(스크롤용) ===== */
  // 고정 버튼 영역을 피해 스크롤이 마지막까지 보이도록 하는 스페이서
  submitSpacer: {
    height: 90, // 고정 버튼+안전여백 고려
  },

  /* ===== 하단 고정 버튼 래퍼 ===== */
  submitWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    // 내부 여백: 페이지 좌우 간격과 통일
    paddingHorizontal: 19,
    paddingTop: 8,
    paddingBottom: 22, // iOS 홈 인디케이터/안드로이드 네비 바 약간 고려

    backgroundColor: COLORS.bg,
    borderTopWidth: 0.5,
    borderTopColor: '#EDEDED',
  },

  /* ===== Submit Button ===== */
  submitButton: {
    height: 50,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
