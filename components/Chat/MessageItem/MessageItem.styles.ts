// /src/components/Chat/MessageItem/MessageItem.styles.ts
import { StyleSheet, Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 피그마 기준 (iPhone 13: 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 반응형 유틸
const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const fontScale = (size: number) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));

const COLORS = {
  bg: '#FFFFFF',
  text: '#1E1E1E',
  subText: '#979797',
  bar: '#F2F3F6',
  primary: '#395884',
  border: '#D9D9D9',
};

export default StyleSheet.create({
  // ===== Chat List(아이템 주변 여백은 MessageList에서 관리) =====

  // 상대방
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  avatar: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: COLORS.border,
    marginRight: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    width: scale(20),
    height: scale(20),
    marginBottom: verticalScale(3),
  },
  bubbleOthers: {
    maxWidth: '70%',
    backgroundColor: COLORS.bar,
    borderRadius: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
  },
  bubbleTextOthers: {
    fontSize: fontScale(14),
    fontWeight: '500',
    color: COLORS.text,
  },
  timeLeft: {
    marginLeft: scale(6),
    fontSize: fontScale(10),
    color: COLORS.subText,
  },

  // 내 메시지
  rowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  bubbleMine: {
    maxWidth: '70%',
    backgroundColor: COLORS.primary,
    borderRadius: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
  },
  bubbleTextMine: {
    fontSize: fontScale(14),
    fontWeight: '500',
    color: '#FFFFFF',
  },
  timeRight: {
    marginRight: scale(6),
    fontSize: fontScale(10),
    color: COLORS.subText,
  },

  // 이미지 메시지
  msgImageMine: {
    width: scale(180),
    height: scale(180),
    borderRadius: scale(8),
    backgroundColor: '#F0F0F0',
  },
  msgImageOthers: {
    width: scale(180),
    height: scale(180),
    borderRadius: scale(8),
    backgroundColor: '#F2F3F6',
    marginLeft: scale(10),
  },
  imageBubbleMine: {
    maxWidth: '70%',
    borderRadius: scale(8),
    padding: scale(2),
  },
  imageBubbleOthers: {
    maxWidth: '70%',
    borderRadius: scale(8),
    padding: scale(2),
  },

  /** ✅ 시스템 메시지(문의사항과 동일한 필 배지) */
  systemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
  },
  systemPill: {
    maxWidth: '85%',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    backgroundColor: '#F1F3F5',
  },
  systemText: {
    fontSize: fontScale(12),
    color: '#6B7280',
    textAlign: 'center',
  },
  systemTime: {
    marginTop: verticalScale(4),
    fontSize: fontScale(11),
    color: '#A1A1AA',
  },
});
