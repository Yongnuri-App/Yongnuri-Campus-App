// components/ListTile/GroupItem/GroupItem.styles.ts
import { StyleSheet, Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준(iPhone 13: 390 x 844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 반응형 스케일러
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

// ---------- 썸네일/간격 상수(반응형) ----------
export const THUMB = Math.round(scale(121)); // 썸네일 폭
export const GAP = Math.round(scale(16));    // 썸네일과 텍스트 간격

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(8),
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowRadius: scale(6),
    ...Platform.select({ android: { elevation: 1 } }),
    marginBottom: verticalScale(12),
    position: 'relative', // 배지/하트 절대배치 기준
    paddingRight: scale(56), // 우측 하트 영역 여유
  },

  // 썸네일
  thumbnail: {
    width: THUMB,
    height: verticalScale(121),
    borderRadius: scale(8),
    backgroundColor: '#D9D9D9',
  },

  // 텍스트 영역
  info: {
    flex: 1,
    marginLeft: GAP,
    justifyContent: 'center',
    marginTop: verticalScale(15),
    marginBottom: verticalScale(40), // 하단 요소 겹침 방지
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },

  // 상태 배지
  badge: {
    minWidth: scale(32),
    height: verticalScale(20),
    borderRadius: scale(5),
    paddingHorizontal: scale(6),
    backgroundColor: '#419EBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  badgeActive: {
    backgroundColor: '#419EBD', // 모집중(파랑)
  },
  badgeClosed: {
    backgroundColor: '#F070C8', // 모집완료(분홍)
  },
  badgeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(10),
    lineHeight: verticalScale(15),
    color: '#FFFFFF',
    textAlign: 'center',
  },

  title: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(15),
    lineHeight: verticalScale(20),
    color: '#212124',
    flexShrink: 1,
  },

  // "모집 인원 - X명"
  recruitLine: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(13),
    lineHeight: verticalScale(18),
    color: '#979797',
    marginBottom: verticalScale(2),
  },

  // 시간 텍스트
  timeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(13),
    lineHeight: verticalScale(18),
    color: '#979797',
  },

  // 카드 내부 하단 배지 (검색 결과용 섹션 라벨 등)
  // left는 컴포넌트에서 동적으로 주입
  bottomTagBox: {
    position: 'absolute',
    bottom: verticalScale(8),
    paddingHorizontal: scale(10),
    height: verticalScale(28),
    backgroundColor: '#F2F3F6',
    justifyContent: 'center',
    zIndex: 1,
  },
  bottomTagText: {
    fontSize: fontScale(12),
    color: '#6B7280',
    fontWeight: '600',
  },

  // 하트(좋아요) 영역 — 카드 내부 우하단
  likeWrap: {
    position: 'absolute',
    right: scale(12),
    bottom: verticalScale(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIcon: {
    width: scale(16),
    height: scale(16),
    marginRight: scale(4),
    resizeMode: 'contain',
    tintColor: '#BBBBBB',
  },
  likeCount: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: fontScale(12),
    lineHeight: verticalScale(16),
    color: '#BBBBBB',
  },
});

export default styles;
