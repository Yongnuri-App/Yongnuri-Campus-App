import { StyleSheet } from 'react-native';

/** 리스트 좌우 패딩과 동일하게 맞추세요. (중복 라인 두꺼워짐 방지용) */
const EDGE = 16;

export default StyleSheet.create({
  container: {
    // 세로 스택: (제목행) -> 본문 -> 시간
    alignItems: 'stretch',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: EDGE,
    backgroundColor: '#FFFFFF',
  },

  // 새 알림 하이라이트 배경
  containerHighlight: {
    backgroundColor: '#E8F1FF',
  },

  // ===== 제목 행 =====
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginHorizontal: 8,
  },
  adminIcon: {
    width: 23,
    height: 23,
    marginRight: 6,
  },
  title: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#1E1E1E',
    flexShrink: 1,
  },
  titleHighlight: {
    color: '#102A56',
  },

  // ===== 본문 =====
  desc: {
    fontSize: 13,
    lineHeight: 22,
    color: '#757575',
    marginHorizontal: 8,
  },
  descHighlight: {
    color: '#365E9D',
  },

  // ===== 시간 =====
  timeRow: {
    marginTop: 2,
    width: '100%',
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 13,
    lineHeight: 22,
    color: '#979797',
    textAlign: 'right',
  },
  timeHighlight: {
    color: '#5C7BAA',
  },

  // ===== 상/하 경계선 (양쪽 끝까지) =====
  topLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 0.5,
    backgroundColor: '#D9D9D9',
  },
  bottomLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0.5,
    backgroundColor: '#D9D9D9',
  },
});
