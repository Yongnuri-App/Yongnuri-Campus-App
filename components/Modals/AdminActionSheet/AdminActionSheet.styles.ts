import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  /** ✅ 반투명 딤(배경 어둡게) */
  dim: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // 살짝 어둡게
  },

  /** 액션 카드 */
  card: {
    position: 'absolute',
    width: 70,
    right: 12,
    top: 83, // 상세 페이지 우상단 아이콘 아래
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 6,

    // 그림자
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,

    zIndex: 20,
    overflow: 'hidden', // 라운딩에 깔끔하게 보이도록
  },

  /** 항목 버튼 */
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },

  /** 항목 텍스트 - 기본/위험 */
  itemText: {
    fontSize: 15,
    color: '#1E1E1E',
    fontWeight: '500',
  },
  itemTextDanger: {
    fontSize: 15,
    color: '#D32F2F',
    fontWeight: '600',
  },

  /** ✅ 구분선(연한 회색 1px) */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    alignSelf: 'stretch',
  },
});
