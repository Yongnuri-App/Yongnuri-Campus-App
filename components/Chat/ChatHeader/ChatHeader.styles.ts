// /src/components/Chat/ChatHeader/ChatHeader.styles.ts
import { StyleSheet } from 'react-native';

const COLORS = {
  bg: '#FFFFFF',
  text: '#1E1E1E',
};

export default StyleSheet.create({
  // 기존 ChatRoomPage.styles.ts의 Header 섹션과 동일
  header: {
    height: 74 + 25, // top: 74px 위치 보정 + 아이콘 높이
    paddingTop: 74,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 74,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    position: 'absolute',
    right: 16,
    top: 74,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { width: 20, height: 20, resizeMode: 'contain' },
  icon_more: { width: 25, height: 25, resizeMode: 'contain' },
  headerTitle: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: 200,
  },
});
