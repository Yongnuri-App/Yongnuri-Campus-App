// pages/Market/MarketDetailPage.styles.ts
import { Dimensions, StyleSheet, Platform } from 'react-native';
const { width } = Dimensions.get('window');

export default StyleSheet.create({
  /* ===== 컨테이너 / 스크롤 ===== */
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 16 },

  /* ===== 상단 이미지 ===== */
  imageArea: {
    width: '100%',
    height: 390, // 피그마 스펙
    backgroundColor: '#D9D9D9',
    position: 'relative',
  },
  mainImage: {
    width,
    height: 390,
    resizeMode: 'cover',
    backgroundColor: '#D9D9D9',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: { color: '#979797' },

  /* ===== 오버레이 아이콘 / 인디케이터 ===== */
  iconBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  icon: { width: 23, height: 23, resizeMode: 'contain' },
  iconLeftTop: { top: 55, left: 16 },
  iconRightTop: { top: 55, right: 16 },

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

  divider: { height: 1, backgroundColor: '#EDEDED', marginTop: 16, marginBottom: 12 },

  /* 제목/가격/시간 */
  titleBlock: { gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#000000' },
  price: { marginLeft: 2, fontSize: 18, fontWeight: '600', color: '#000000' },
  time: { marginLeft: 2, fontSize: 12, fontWeight: '500', color: '#979797' },

  /* 설명 */
  desc: { marginTop: 24, fontSize: 15, lineHeight: 20, color: '#212124' },

  /* 거래 희망 장소 */
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, gap: 16 },
  locationLabel: { fontSize: 16, fontWeight: '700', color: '#000000' },
  locationValue: { fontSize: 16, fontWeight: '400', color: '#000000' },

  /* 프로필 (ProfileRow 쓰지만 유지) */
  profileRow: { flexDirection: 'row', alignItems: 'center', height: 53 },
  avatar: { width: 53, height: 53, borderRadius: 26.5, backgroundColor: '#D9D9D9' },
  profileTextCol: { marginLeft: 9, justifyContent: 'center' },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1E1E1E', lineHeight: 23 },
  profileDept: { fontSize: 12, fontWeight: '400', color: '#979797', lineHeight: 17 },

  /* 로딩 */
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  fallbackText: { color: '#797979' },
});
