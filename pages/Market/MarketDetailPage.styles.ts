// pages/Market/MarketDetailPage.styles.ts
import { Dimensions, StyleSheet } from 'react-native';
const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  /* ✅ 전체 ScrollView의 content 컨테이너 (하단 여백만) */
  contentContainer: { paddingBottom: 16 },

  /* ===== 이미지 상단 영역 ===== */
  imageArea: {
    width: '100%',
    height: 390, // 피그마 스펙
    backgroundColor: '#D9D9D9',
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

  /* 오버레이 아이콘 공통 */
  iconBtn: {
    position: 'absolute',
    // width: 32,
    // height: 32,
    // borderRadius: 16,
    // backgroundColor: 'rgba(255,255,255,0.8)',
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
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16 },

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
    backgroundColor: '#D9D9D9', // 임시
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

  /* 제목/가격/시간 */
  titleBlock: { gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#000000' },
  price: { marginLeft: 2, fontSize: 18, fontWeight: '600', color: '#000000' },
  time: { marginLeft: 2, fontSize: 12, fontWeight: '500', color: '#979797' },

  /* 설명 */
  desc: {
    marginTop: 24,
    fontSize: 15,
    lineHeight: 20,
    color: '#212124',
  },

  /* 거래 희망 장소 */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    gap: 16,
  },
  locationLabel: { fontSize: 16, fontWeight: '700', color: '#000000' },
  locationValue: { fontSize: 16, fontWeight: '400', color: '#000000' },

  /* 로딩/플레이스홀더 */
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  fallbackText: { color: '#797979' },
});
