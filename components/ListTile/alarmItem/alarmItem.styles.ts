// components/NotificationItem/NotificationItem.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;   // 피그마(iPhone 13) 기준
const BASE_HEIGHT = 844;

// 반응형 스케일 함수
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

/** 리스트 좌우 패딩과 동일하게 맞추세요. (중복 라인 두꺼워짐 방지용) */
const EDGE = scale(16);

export default StyleSheet.create({
  container: {
    // 세로 스택: (제목행) -> 본문 -> 시간
    alignItems: 'stretch',
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(8),
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
    marginBottom: verticalScale(4),
    marginHorizontal: scale(8),
  },
  adminIcon: {
    width: scale(23),
    height: scale(23),
    marginRight: scale(6),
  },
  title: {
    fontSize: fontScale(15),
    lineHeight: verticalScale(22),
    fontWeight: '500',
    color: '#1E1E1E',
    flexShrink: 1,
  },
  titleHighlight: {
    color: '#102A56',
  },

  // ===== 본문 =====
  desc: {
    fontSize: fontScale(13),
    lineHeight: verticalScale(22),
    color: '#757575',
    marginHorizontal: scale(8),
  },
  descHighlight: {
    color: '#365E9D',
  },

  // ===== 시간 =====
  timeRow: {
    marginTop: verticalScale(2),
    width: '100%',
    alignItems: 'flex-end',
  },
  time: {
    fontSize: fontScale(13),
    lineHeight: verticalScale(22),
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D9D9D9',
  },
  bottomLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D9D9D9',
  },
});
