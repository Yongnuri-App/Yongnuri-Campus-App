import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  // 상세 페이지들과 동일 스펙 유지
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 53,
  },
  // 고정 이미지 사용 → 배경색 제거, 둥근 썸네일 유지
  avatar: {
    width: 53,
    height: 53,
    borderRadius: 26.5,
  },
  profileTextCol: {
    marginLeft: 9,
    justifyContent: 'center',
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
    lineHeight: 23,
  },
  profileDept: {
    fontSize: 12,
    fontWeight: '400',
    color: '#979797',
    lineHeight: 17,
  },
});
