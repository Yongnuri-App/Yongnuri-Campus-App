import { Dimensions, StyleSheet } from 'react-native';
const { width } = Dimensions.get('window');

export default StyleSheet.create({
  /* ===== 공통 컨테이너 ===== */
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 16 },

  /* ===== 이미지 상단 영역 ===== */
  imageArea: {
    width: '100%',
    height: 390,             // 피그마 스펙과 동일
    backgroundColor: '#D9D9D9',
  },
  mainImage: {
    width,
    height: 390,
    resizeMode: 'cover',
    backgroundColor: '#D9D9D9',
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: '#979797' },

  /* 오버레이 아이콘 (뒤로가기/신고) */
  iconBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 23, height: 23, resizeMode: 'contain' },
  iconLeftTop: { top: 55, left: 16 },
  iconRightTop: { top: 55, right: 16 },

  /* 우하단 이미지 카운터 */
  counterPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(57, 58, 64, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },

  /* ===== 본문 ===== */
  body: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16 },

  /* 프로필 */
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 53,
  },
  avatar: {
    width: 53,
    height: 53,
    borderRadius: 26.5,
    backgroundColor: '#D9D9D9',
  },
  profileTextCol: { marginLeft: 9, justifyContent: 'center' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1E1E1E', lineHeight: 23 },
  profileDept: { fontSize: 12, fontWeight: '400', color: '#979797', lineHeight: 17 },

  divider: {
    height: 1,
    backgroundColor: '#EDEDED',
    marginTop: 16,
    marginBottom: 12,
  },

  /* ===== 제목 + 신청 버튼 라인 ===== */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    paddingRight: 12, // 버튼과 간격
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  applyBtn: {
    minWidth: 56,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#979797',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* ===== 모집 정보/시간 ===== */
  recruitLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#979797',
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
    color: '#979797',
    marginBottom: 8,
  },

  /* ===== 설명 카드 ===== */
  descCard: {
    marginTop: 15,
    borderRadius: 8,
  },
  descText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#212124',
  },

  /* ===== 신청 링크 섹션 ===== */
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#000000', marginBottom: 6, marginTop: 10 },
  linkText: {
    fontSize: 14,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },

  /* 로딩/플레이스홀더 */
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  fallbackText: { color: '#797979' },
});
