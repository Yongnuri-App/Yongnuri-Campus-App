import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // 본문 컨텐츠가 탭바 뒤에 가리지 않도록 bottom padding 추가
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100, // 하단 탭바 높이(86) + 여유
  },
  exampleText: {
    fontSize: 16,
  },
});

export default styles;