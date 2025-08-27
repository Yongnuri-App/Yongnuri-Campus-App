// pages/Chat/ChatRoomPage.styles.ts
import { StyleSheet } from 'react-native';

const COLORS = {
  bg: '#FFFFFF',
  text: '#1E1E1E',
  subText: '#979797',
  bar: '#F2F3F6',
  primary: '#395884', // 말풍선(내 메시지), 버튼
  border: '#D9D9D9',
  shadow: 'rgba(0,0,0,0.1)',
};

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* ===== Header ===== */
  header: {
    height: 74 + 25, // top: 74px 위치 보정 + 아이콘 높이
    paddingTop: 74,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 74,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    position: 'absolute',
    right: 16,
    top: 74,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  icon_more: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: 200,
  },

  /* ===== Product Card ===== */
  productCardShadowWrap: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.bg,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 27,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
  },
  thumbWrap: { marginRight: 8 },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  thumbPlaceholder: {
    backgroundColor: COLORS.border,
  },
  infoWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    paddingBottom: 3,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  scheduleBtn: {
    width: 79,
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
    marginLeft: 26,
  },
  calendarIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  scheduleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },

  /* ===== Chat List ===== */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100, // 하단바 겹침 방지
  },

  // 상대방
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
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

  /* ===== More Menu Modal ===== */
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 74 + 25 + 8, // 헤더 아래 여백
    paddingRight: 8,
  },
  menuBox: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEE',
  },

  // 첨부 썸네일 바
  attachBar: {
    // borderTopWidth: 1,
    // borderTopColor: '#EEE',
    // backgroundColor: '#FFF',
    zIndex: 2,       // 입력바 그림자에 가려지는 걸 방지
    elevation: 2,    // (Android)
    marginBottom: 80,
  },
  attachScroll: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  thumbWrapAttach: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
    backgroundColor: '#EDEDED',
  },
  thumbAttach: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeX: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '700',
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
    // backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 2,
  },
  imageBubbleOthers: {
    maxWidth: '70%',
    // backgroundColor: COLORS.bar,
    borderRadius: 8,
    padding: 2,
  },

  badgeBase: {
  paddingHorizontal: 7,
  paddingVertical: 4,
  borderRadius: 4,
  marginRight: 6,
},
badgeLost: {
  backgroundColor: '#F070C8', // 분실
},
badgeFound: {
  backgroundColor: '#419EBD', // 습득
},
badgeText: {                  // 이미 있다면 유지
  fontSize: 11,
  fontWeight: '600',
  color: '#FFFFFF',
},
placeText: {                  // 이미 있다면 유지
  fontSize: 14,
  fontWeight: '700',
  color: '#393A40',
},
});
