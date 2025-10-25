import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  /* 컨테이너 */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -40,
  },
  statusBar: {
    height: 44, // 피그마 상단 여백 느낌만 맞춤
    backgroundColor: '#FFFFFF',
  },

  /* 헤더 */
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 22,
    color: '#1E1E1E',
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
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#1E1E1E',
  },

  /* 스크롤 콘텐츠 */
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },

  /* 빈 상태 */
  emptyWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1E',
  },
  emptySub: {
    marginTop: 6,
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#979797',
  },
  muted: {
    color: '#979797',
    fontSize: 13,
  },

  /* 리스트 행 */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D9D9D9',
    overflow: 'hidden', // 내부 이미지가 둥글게 잘리게
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: '#D9D9D9',
  },
  avatarIcon: {
    width: 28,
    height: 28,
    marginBottom: 3,
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#1E1E1E',
  },
  dept: {
    marginTop: 2,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#979797',
  },

  /* 관리 버튼 (피그마 작은 pill) */
  manageBtn: {
    width: 53,
    height: 37,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F3F6',
  },
  manageText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    color: '#212124',
  },
});
