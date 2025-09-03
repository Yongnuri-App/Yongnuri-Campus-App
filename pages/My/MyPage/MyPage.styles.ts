import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  /* 컨테이너 */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -40,
  },
  statusBar: {
    height: 44, // 피그마 iOS Status Bar
    backgroundColor: '#FFFFFF',
  },

  /* 헤더 */
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 19,
    lineHeight: 22,
    color: '#1E1E1E',
  },
  headerRight: {
    position: 'absolute',
    right: 16,
    top: 8,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#1E1E1E',
  },

  /* 스크롤 콘텐츠 */
  contentContainer: {
    paddingBottom: 24,
  },

  /* 상단 인사 */
  greetingWrap: {
    marginTop: 28, // 피그마 top:124 부근 감안해서 여백 조절
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTextCol: {
    flexShrink: 1,
  },
  greeting: {
    fontFamily: 'Inter',
    fontWeight: '700', // 헤더 느낌 살짝 강조
    fontSize: 17,
    lineHeight: 22,
    color: '#1E1E1E',
  },
  subId: {
    marginTop: 4,
    marginLeft: 4,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 22,
    color: '#979797',
  },
  greetingArrow: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: '#979797',
    marginLeft: 12,
  },

  /* 구분선 (Vector 115 / 116) */
  dividerTop: {
    height: 1,
    backgroundColor: '#979797',
    marginTop: 24,
    marginHorizontal: 16,
    opacity: 0.6,
  },
  dividerMid: {
    height: 1,
    backgroundColor: '#979797',
    marginTop: 24,
    marginHorizontal: 16,
    opacity: 0.6,
  },

  /* 섹션 타이틀/캡션 */
  sectionCaption: {
    marginTop: 24, // '나의 거래', '기타' 회색 작은 텍스트
    marginBottom: 20,
    marginLeft: 20,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 22,
    color: '#979797',
  },
  sectionTitle: {
    marginTop: 16, // 👈 원래 24 → 16 (관심목록과 거래내역 사이 중간 느낌)
    marginBottom: 16,
    marginLeft: 20,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    color: '#1E1E1E',
  },

  /* 행 (우측 화살표 제거 상태) */
  row: {
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent 유지해도 무방하지만 우측 아이콘이 없으니 시작 정렬이 자연스러움
    justifyContent: 'flex-start',
  },
  rowText: {
    fontFamily: 'Inter',
    fontWeight: '700', // 요청대로 더 두껍게
    fontSize: 15,
    lineHeight: 22,
    color: '#1E1E1E',
  },
});
