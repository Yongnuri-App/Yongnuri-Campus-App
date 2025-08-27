import { StyleSheet } from 'react-native';

/**
 * 기존 ChatRoomPage.styles.ts의 attachBar 관련 값 유지
 * - 단, 항상 화면 하단(절대 위치)에 뜨도록 container를 추가
 */
export default StyleSheet.create({
  // 전체를 절대 위치로 띄워서 bottom을 동적으로 제어
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    // bottom은 컴포넌트에서 동적으로 지정
    zIndex: 2,     // 입력바/그림자 위에 표시
    elevation: 2,  // Android
  },

  attachBar: {
    // borderTopWidth: 1,
    // borderTopColor: '#EEE',
    // backgroundColor: '#FFF',
  },
  attachScroll: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  thumbWrapAttach: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
    backgroundColor: '#EDEDED',
  },
  thumbAttach: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeX: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '700',
  },
});
