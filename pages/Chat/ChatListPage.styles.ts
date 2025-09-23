// pages/Chat/ChatListPage.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // 피그마: 상단 여백/폰트/크기 반영
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
    marginLeft: 8, // 여백 추가
  },

  // 리스트
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
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
    width: 22,
    height: 22,
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
});
