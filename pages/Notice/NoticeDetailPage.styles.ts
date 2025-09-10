// pages/Notice/NoticeDetailPage.styles.ts
import { Dimensions, StyleSheet } from 'react-native';
const { width } = Dimensions.get('window');

export default StyleSheet.create({
  /* ===== 컨테이너 ===== */
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 16 },

  /* ===== 상단 이미지 영역 ===== */
  imageArea: { width: '100%', height: 390, backgroundColor: '#D9D9D9' },
  mainImage: { width, height: 390, resizeMode: 'cover', backgroundColor: '#D9D9D9' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: '#979797' },

  /* ===== 오버레이 아이콘 ===== */
  iconBtn: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  icon: { width: 23, height: 23, resizeMode: 'contain' },
  iconLeftTop: { top: 55, left: 16 },
  iconRightTop: { top: 55, right: 16 },

  /* ===== 1 / N 인디케이터 ===== */
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

  divider: {
    height: 1,
    backgroundColor: '#EDEDED',
    marginTop: 16,
    marginBottom: 12,
  },

  /* 제목 라인(배지 + 제목 + 하트) */
  titleLine: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 6 },

  badgeBase: {
    height: 20,
    minWidth: 39,
    paddingHorizontal: 6,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeOpen: { backgroundColor: '#419EBD' },
  badgeClosed: { backgroundColor: '#9B9B9B' },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 15, fontWeight: '500' },

  title: { flex: 1, paddingRight: 12, fontSize: 20, fontWeight: '700', color: '#000000' },

  heartBtn: { paddingHorizontal: 6, paddingVertical: 4, marginLeft: 4 },
  heartIcon: { width: 22, height: 22, resizeMode: 'contain' },

  term: { fontSize: 13, color: '#555', marginTop: 2 },
  timeAgo: { fontSize: 12, color: '#8E8E93', marginTop: 6 },

  descCard: { marginTop: 12, borderRadius: 8 },
  descText: { fontSize: 15, lineHeight: 20, color: '#212124' },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#000000', marginBottom: 6, marginTop: 12 },
  linkText: { fontSize: 14, color: '#2563EB', textDecorationLine: 'underline' },

  /* 로딩 */
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  fallbackText: { color: '#797979' },

  /* ===== 관리자 옵션 오버레이 ===== */
  ownerDim: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  ownerMenuCard: {
    position: 'absolute',
    right: 12,
    top: 55 + 28,
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
    zIndex: 20,
  },
  ownerMenuItem: { paddingVertical: 10, paddingHorizontal: 12 },
  ownerMenuText: { fontSize: 14, color: '#1E1E1E' },
  ownerMenuTextDanger: { fontSize: 14, color: '#D32F2F', fontWeight: '700' },
});
