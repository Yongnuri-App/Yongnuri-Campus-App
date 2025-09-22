// pages/GroupBuy/GroupBuyDetailPage.styles.ts
import { Dimensions, StyleSheet } from 'react-native';
const { width } = Dimensions.get('window');

export default StyleSheet.create({
  /* ===== 공통 컨테이너 ===== */
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 16 },

  /* ===== 이미지 상단 영역 ===== */
  imageArea: {
    width: '100%',
    height: 390,
    backgroundColor: '#D9D9D9',
    position: 'relative',
  },
  mainImage: {
    width,
    height: 390,
    resizeMode: 'cover',
    backgroundColor: '#D9D9D9',
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: '#979797' },

  /* ===== 오버레이 아이콘 ===== */
  iconBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  icon: { width: 23, height: 23, resizeMode: 'contain' },
  iconLeftTop: { top: 55, left: 16 },
  iconRightTop: { top: 55, right: 16 },

  /* ===== 하단 인디케이터 ===== */
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
    zIndex: 20,
  },
  counterText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },

  /* ===== 본문 ===== */
  body: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16 },

  /* 프로필 */
  profileRow: { flexDirection: 'row', alignItems: 'center', height: 53 },
  avatar: { width: 53, height: 53, borderRadius: 26.5, backgroundColor: '#D9D9D9' },
  profileTextCol: { marginLeft: 9, justifyContent: 'center' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1E1E1E', lineHeight: 23 },
  profileDept: { fontSize: 12, fontWeight: '400', color: '#979797', lineHeight: 17 },

  divider: { height: 1, backgroundColor: '#EDEDED', marginTop: 16, marginBottom: 12 },

  /* 제목 + 신청 버튼 라인 */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    paddingRight: 12,
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
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  /* 모집 정보 / 시간 */
  recruitLine: { fontSize: 14, fontWeight: '600', color: '#979797', marginBottom: 6 },
  time: { fontSize: 12, fontWeight: '500', color: '#979797', marginBottom: 8 },

  /* 설명 카드 */
  descCard: { marginTop: 15, borderRadius: 8 },
  descText: { fontSize: 15, lineHeight: 20, color: '#212124' },

  /* 신청 링크 섹션 */
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#000000', marginBottom: 6, marginTop: 10 },
  linkText: { fontSize: 14, color: '#2563EB', textDecorationLine: 'underline' },

  /* 로딩 */
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  fallbackText: { color: '#797979' },

  /* ====== 현재 모집 인원 라인 & 컨트롤 ====== */
  recruitLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recruitLineLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7A7A7A',
    marginRight: 10,
  },
  recruitLineSuffix: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#7A7A7A',
  },

  /* 작성자(소유자): 드롭다운 */
  countPickerWrap: { position: 'relative' },
  countPickerButton: {
    minWidth: 60,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C8C8C8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countPickerValue: { fontSize: 15, fontWeight: '600', color: '#1E1E1E' },
  countPickerIcon: { width: 20, height: 20, marginLeft: 8, tintColor: '#7A7A7A' },
  countDropdown: {
    position: 'absolute',
    top: 46,
    left: 0,
    width: 120,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 20,
  },
  countOption: { paddingVertical: 10, paddingHorizontal: 14 },
  countOptionText: { fontSize: 16, color: '#1E1E1E' },

  /* 일반 사용자: 정적 박스 */
  countStaticWrap: {
    minWidth: 30,
    height: 20,
    paddingHorizontal: 14,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countStaticText: { fontSize: 15, fontWeight: '500', color: '#1E1E1E' },
});
