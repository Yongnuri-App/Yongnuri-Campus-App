// components/ListTile/alarmItem/alarmItem.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    // 세로 스택: 제목 -> 본문 -> 시간
    alignItems: 'stretch',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
    color: '#1E1E1E',
    marginBottom: 4,
  },

  // 본문이 오른쪽 끝(FlatList content padding까지) 가도록 별도 여백 X
  desc: {
    fontSize: 15,
    lineHeight: 22,
    color: '#757575',
  },

  // 시간 행: 항상 맨 아래, 우측 정렬
  timeRow: {
    marginTop: 6,           // 본문과 간격
    width: '100%',
    alignItems: 'flex-end', // 오른쪽 끝으로
  },
  time: {
    fontSize: 13,
    lineHeight: 22,
    color: '#979797',
    textAlign: 'right',
  },
});
