// pages/Chat/ChatListPage.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // 🧭 상단 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 18,
  },
  title: {
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 25,
    color: '#1E1E1E',
    marginLeft: 8,
  },

  // 📜 리스트
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF', // Swipeable과 겹칠 때 배경 분리
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F3F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarIcon: {
    width: 25,
    height: 25,
    marginBottom: 3,
    opacity: 0.8,
  },
  chatTexts: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nickname: {
    maxWidth: '70%',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: '#1E1E1E',
    marginRight: 8,
  },
  time: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 13,
    color: '#979797',
  },
  lastMessage: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 20,
    color: '#1E1E1E',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#395884', // 브랜드 톤
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#EFEFEF',
  },

  // 👉 스와이프 액션(오른쪽) 영역 스타일
  swipeActionContainer: {
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deleteAction: {
    flex: 1,
    borderRadius: 1,
    minHeight: 48,
    paddingHorizontal: 20,
    backgroundColor: '#EB3B3B', // 삭제는 빨강 계열이 직관적
    justifyContent: 'center',
    alignItems: 'center',
    // 살짝 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
