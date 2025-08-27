import { Dimensions, StyleSheet } from 'react-native';
const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 16 },

  /* ===== 상단 이미지 ===== */
  imageArea: {
    width: '100%',
    height: 390,                 // 피그마 스펙
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

  /* 오버레이 아이콘 */
  iconBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 23, height: 23, resizeMode: 'contain' },
  iconLeftTop: { top: 55, left: 16 },
  iconRightTop: { top: 55, right: 16 },

  /* 우하단 카운터 */
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

  /* 임시 프로필 */
  profileRow: { flexDirection: 'row', alignItems: 'center', height: 53 },
  avatar: { width: 53, height: 53, borderRadius: 26.5, backgroundColor: '#D9D9D9' },
  profileTextCol: { marginLeft: 9, justifyContent: 'center' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1E1E1E', lineHeight: 23 },
  profileDept: { fontSize: 12, fontWeight: '400', color: '#979797', lineHeight: 17 },

  divider: { height: 1, backgroundColor: '#EDEDED', marginTop: 16, marginBottom: 12 },

  /* 뱃지 + 제목 */
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLost: { backgroundColor: '#F070C8' },
  badgeFound: { backgroundColor: '#419EBD' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  title: { fontSize: 20, fontWeight: '700', color: '#000000', flexShrink: 1 },

  time: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#979797' },

  desc: { marginTop: 20, fontSize: 15, lineHeight: 20, color: '#212124' },

  /* 분실/습득 장소 */
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 8 },
  locationLabel: { fontSize: 16, fontWeight: '700', color: '#000000' },
  locationValue: { fontSize: 16, fontWeight: '400', color: '#000000' },

  /* 로딩 */
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  fallbackText: { color: '#797979' },

  /* ===== (추가) 오너 메뉴 오버레이 ===== */
  ownerDim: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    // (기존 인라인과 동일: zIndex 지정 없음, 렌더 순서로 카드가 위에 위치)
  },
  ownerMenuCard: {
    position: 'absolute',
    right: 12,
    top: 55 + 28,                 // 기존 인라인과 동일 값
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 6,
    // iOS/Android 그림자: 기존 elevation/shadow 그대로
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 20,                   // 기존 인라인과 동일
  },
  ownerMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ownerMenuText: {
    fontSize: 14,
    color: '#1E1E1E',
  },
  ownerMenuTextDanger: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '700',
  },
});
