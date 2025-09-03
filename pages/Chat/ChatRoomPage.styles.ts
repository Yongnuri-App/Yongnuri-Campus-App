// pages/Chat/ChatRoomPage.styles.ts
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
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    paddingBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  /** 공동구매 모집 인원 라벨 */
  groupBuyLabel: {
    fontSize: 15,
    fontWeight: '700',
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

  /* ===== Lost 전용 배지/장소 텍스트 ===== */
  badgeBase: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeLost: {
    backgroundColor: '#F070C8',
  },
  badgeFound: {
    backgroundColor: '#419EBD',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#393A40',
  },
});
