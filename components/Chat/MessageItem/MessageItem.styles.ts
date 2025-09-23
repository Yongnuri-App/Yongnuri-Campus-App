// /src/components/Chat/MessageItem/MessageItem.styles.ts
import { StyleSheet } from 'react-native';

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
    marginBottom: 12,
    paddingHorizontal: 16, // 기존 listContent의 좌우 패딩을 아이템에서도 동일하게
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    marginRight: 10,
  },
  bubbleOthers: {
    maxWidth: '70%',
    backgroundColor: COLORS.bar,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleTextOthers: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  timeLeft: {
    marginLeft: 6,
    fontSize: 10,
    color: COLORS.subText,
  },

  // 내 메시지
  rowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  bubbleMine: {
    maxWidth: '70%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleTextMine: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  timeRight: {
    marginRight: 6,
    fontSize: 10,
    color: COLORS.subText,
  },

  // 이미지 메시지
  msgImageMine: {
    width: 180,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  msgImageOthers: {
    width: 180,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F2F3F6',
    marginLeft: 10, // 아바타와 간격
  },
  imageBubbleMine: {
    maxWidth: '70%',
    borderRadius: 8,
    padding: 2,
  },
  imageBubbleOthers: {
    maxWidth: '70%',
    borderRadius: 8,
    padding: 2,
  },

  /** ✅ 시스템 메시지(문의사항과 동일한 필 배지) */
  systemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  systemPill: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F3F5', // 라이트 그레이
  },
  systemText: {
    fontSize: 12,
    color: '#6B7280', // 중간 그레이
    textAlign: 'center',
  },
  systemTime: {
    marginTop: 4,
    fontSize: 11,
    color: '#A1A1AA',
  },
});
