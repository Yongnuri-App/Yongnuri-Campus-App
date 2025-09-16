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

  /** 약속잡기 버튼 (기존) */
  scheduleBtn: {
    width: 80,
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 5,
    // NOTE: 이전엔 카드 옆에 단독 배치라 marginLeft: 26이 있었음.
    // 액션 행(좌/우)로 재배치했으므로 여백은 래퍼(actionsRow)에서 통일.
    // 필요시 유지해도 되지만, 시각적으로 오른쪽 정렬이 어긋나면 제거 권장.
    // marginLeft: 26,
  },
  calendarIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  scheduleBtnText: {
    fontSize: 13,
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

  /* ===== 상단 카드 하단 액션 행 =====
     - 좌측: 약속잡기 (기존)
     - 우측: 판매상태 셀렉터(중고거래 + 판매자 전용) */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    paddingHorizontal: 27, // 카드와 좌우 라인 맞춤
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
    backgroundColor: COLORS.bg,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // 디버깅용
  debugBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    // 살짝 그림자 (iOS/Android 공통 무난 설정)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  debugText: {
    fontSize: 11,
    color: COLORS.subText,
    lineHeight: 16,
  },
});
