// /src/components/Chat/MessageList/MessageList.styles.ts
import { StyleSheet, Dimensions } from 'react-native';

// 피그마 기준 (iPhone 13: 390x844)
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 반응형 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

export default StyleSheet.create({
  // 기존 ChatRoomPage.styles.ts의 listContent와 동일
  listContent: {
    paddingHorizontal: scale(6),
    paddingTop: verticalScale(12),
    // paddingBottom은 컴포넌트 prop에서 주입
  },
});
