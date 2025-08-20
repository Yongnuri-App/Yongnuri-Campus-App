import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  // 가로 스크롤 한 줄 레이아웃
  row: {
    alignItems: 'center',
    // 타일 간격 (addTile 포함)
    paddingRight: 4,
  },

  /* ➕ 추가 타일 (기존 photoBox 스타일 기반) */
  addTile: {
    width: 65,
    height: 65,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginRight: 8, // 다음 썸네일과 간격
    backgroundColor: '#FFFFFF',
  },
  cameraIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
    opacity: 0.7,
    marginBottom: 3,
  },
  countText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#979797',
  },

  /* 썸네일 */
  thumbWrap: {
    marginRight: 8,
  },
  thumb: {
    width: 65,
    height: 65,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#393A40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeX: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 14,
  },
});
