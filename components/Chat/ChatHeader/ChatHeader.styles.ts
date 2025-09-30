// /components/Chat/ChatHeader/ChatHeader.styles.ts

import { StyleSheet } from 'react-native';

const COLORS = {
  bg: '#FFFFFF',
  text: '#1E1E1E',
  subText: '#979797',
  border: '#D9D9D9',
};

export default StyleSheet.create({
  /** 전체 래퍼: 상단 헤더 + 헤더 아래 카드 포함 */
  wrap: {
    backgroundColor: COLORS.bg,
  },

  // ===== 기존 헤더 영역 =====
  header: {
    height: 74 + 25, // top: 74px 위치 보정 + 아이콘 높이
    paddingTop: 74,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
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
  icon: { width: 20, height: 20, resizeMode: 'contain' },
  icon_more: { width: 25, height: 25, resizeMode: 'contain' },
  headerTitle: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: 200,
  },

  // ===== 헤더 하단: 게시글 요약 카드 =====
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 27,   // ChatRoomPage 카드와 좌우 정렬 맞춤
    paddingVertical: 14,     // ChatRoomPage 카드와 동일
    backgroundColor: COLORS.bg,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: COLORS.border,
  },
  thumbWrap: { marginRight: 8 },
  thumb: {
    width: 50,               // ChatRoomPage 카드와 동일
    height: 50,
    borderRadius: 4,
  },
  thumbPlaceholder: {
    backgroundColor: COLORS.border,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    paddingBottom: 5,
  },

  // ===== 부가 정보 (가격 / 배지 / 위치 / 모집인원) =====
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  groupBuyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
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
    fontSize: 15,
    fontWeight: '700',
    color: '#393A40',
  },
});
