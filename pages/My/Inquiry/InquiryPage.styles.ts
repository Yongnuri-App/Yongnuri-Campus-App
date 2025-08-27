import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  statusBar: { height: 44, backgroundColor: '#FFFFFF' },

  /* 헤더 */
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
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
    left: 16,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#323232',
    resizeMode: 'contain',
  },

  /* 공지 카드 */
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EDEDED',
    borderRadius: 4,
  },
  noticeIcon: {
    width: 24,
    height: 24,
    tintColor: '#979797',
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 18,
    color: '#797979',
  },

  /* 메시지 영역 */
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D9D9D9',
    marginRight: 10,
  },
  bubble: {
    maxWidth: '70%',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    backgroundColor: '#395884',
    marginLeft: 40, // 타임텍스트 간격 확보
  },
  bubbleOther: {
    backgroundColor: '#F2F3F6',
  },
  msgText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 20,
  },
  msgTextMe: { color: '#FFFFFF' },
  msgTextOther: { color: '#1E1E1E' },

  timeText: {
    marginLeft: 8,
    marginRight: 2,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 13,
    color: '#979797',
  },
});
