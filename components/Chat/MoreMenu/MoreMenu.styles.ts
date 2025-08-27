// /src/components/Chat/MoreMenu/MoreMenu.styles.ts
import { StyleSheet } from 'react-native';

const COLORS = {
  text: '#1E1E1E',
};

export default StyleSheet.create({
  // 기존 ChatRoomPage.styles.ts의 More Menu Modal 섹션을 그대로 반영
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 74 + 25 + 8, // 헤더 아래 여백
    paddingRight: 8,
  },
  menuBox: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEE',
  },
});
