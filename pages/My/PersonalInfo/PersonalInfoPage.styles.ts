import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  /* 컨테이너 */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop:-40,
  },
  statusBar: {
    height: 44,
    backgroundColor: '#FFFFFF',
  },

  /* 헤더 */
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: '#1E1E1E',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 22,
    color: '#1E1E1E',
  },

  /* 스크롤 콘텐츠 */
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  /* 섹션 캡션 */
  sectionCaption: {
    marginTop: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 22,
    color: '#979797',
  },

  /* 라벨/값 */
  fieldLabelMuted: {
    marginTop: 16,
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 22,
    color: '#D9D9D9',
  },
  readonlyValue: {
    marginTop: 6,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
    color: '#1E1E1E',
  },

  /* 구분선 */
  divider: {
    height: 1,
    backgroundColor: '#D9D9D9',
    marginTop: 12,
  },

  /* 입력창 (닉네임) */
  input: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#1E1E1E',
  },

  /* 회색 스트립 (Rectangle 445 / 443) */
  grayStrip: {
    height: 5,
    backgroundColor: '#F4F4F4',
    marginTop: 22,
    marginHorizontal: -20, // 좌우가 화면 끝까지 차도록
  },

  /* 액션 라인 */
  actionRow: {
    height: 44,
    justifyContent: 'center',
    marginTop: 12,
  },
  actionText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
    color: '#1E1E1E',
  },

  /* 하단 고정 푸터 */
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 20,
  },

  /* 완료 버튼 */
  primaryButton: {
    height: 50,
    borderRadius: 50,
    backgroundColor: '#D9D9D9', // 기본 회색
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonActive: {
    backgroundColor: '#395884', // 닉네임 변경 시
  },
  primaryButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF',
  },
});
