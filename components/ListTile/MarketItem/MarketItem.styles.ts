// components/ListTile/MarketItem/MarketItem.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    // shadow 대신 RN용 그림자
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 12,
    // ✅ 하단 배지/하트를 카드 내부에 고정하기 위한 기준
    position: 'relative',
  },
  thumbnail: {
    width: 121,
    height: 121,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    marginBottom: 40, // (유지)
  },
  title: {
    width: 216,        // Figma 기준
    height: 20,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 20,    // identical to box height
    color: '#212124',
    marginBottom: 3,   // subtitle과 간격 조절
  },
  subtitle: {
    width: 114,
    height: 15,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 15,
    color: '#979797',
    marginBottom: 5,   // price와 간격 조절
  },
  price: {
    width: 152,
    height: 20,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
    color: '#000000',
  },

  // ✅ 하트 영역: 카드 **오른쪽 하단** 고정
  likeWrap: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIcon: {
    width: 14,
    height: 14,
    tintColor: '#BBBBBB',
    marginRight: 4,
  },
  likeCount: {
    fontSize: 11,
    fontWeight: '500',
    color: '#BBBBBB',
  },

  // ✅ 하단 배지: 카드 **왼쪽 하단**(텍스트 시작선) 고정
  // 썸네일(121) + 간격(16) = 137 지점에 붙임
  bottomTagBox: {
    position: 'absolute',
    left: 137,
    bottom: 8,
    paddingHorizontal: 10,
    height: 28,
    backgroundColor: '#F2F3F6',
    justifyContent: 'center',
  },
  bottomTagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
