import { StyleSheet } from 'react-native';

/**
 * 피그마 스펙을 RN 친화적으로 변환:
 * - height: 86, 상단 보더/그림자
 * - 좌: 하트 24x24, 중: 입력칸(272x39), 우: 전송(55x39)
 * - 절대 위치 대신 flex row로 배치
 */
export default StyleSheet.create({
  kav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // 화면 하단 고정
  },
  safe: {
    backgroundColor: '#FFFFFF',
  },
  wrap: {
    height: 80,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    // 상단 그림자 (iOS/안드)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1,
    marginRight: 8,
  },
  heartIcon: { width: 28, height: 28 },

  inputBox: {
    flex: 1,
    height: 42,
    backgroundColor: '#EDEDED',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  input: {
    fontSize: 15,
    color: '#1E1E1E',
    paddingVertical: 0, // iOS에서 수직 센터 맞춤
  },

  sendBtn: {
    width: 55,
    height: 42,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#9FB0C9',
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
});
