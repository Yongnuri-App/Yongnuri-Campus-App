// components/ListTile/GroupItem/GroupItem.styles.ts
import { StyleSheet } from 'react-native';

export const THUMB = 121; // 썸네일 폭
export const GAP = 16;    // 썸네일과 텍스트 영역 간격

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
    position: 'relative', // 배지/하트 절대배치 기준
    paddingRight: 56,     // 오른쪽 하트 영역만큼 여유
  },

  // 썸네일
  thumbnail: {
    width: THUMB,
    height: 121,
    borderRadius: 8,
    backgroundColor: '#D9D9D9',
  },

  // 텍스트 영역
  info: {
    flex: 1,
    marginLeft: GAP,
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 40, // 하단 겹침(배지/하트) 방지 여백
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  // 상태 배지
  badge: {
    minWidth: 32,
    height: 20,
    borderRadius: 5,
    paddingHorizontal: 6,
    backgroundColor: '#419EBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
    fontSize: 10,
    lineHeight: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  title: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 20,
    color: '#212124',
    flexShrink: 1,
  },

  // "모집 인원 - X명"
  recruitLine: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
    color: '#979797',
    marginBottom: 2,
  },

  // 시간 텍스트
  timeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
    color: '#979797',
  },

  // 카드 내부 하단 배지 (검색 결과용 섹션 라벨 등)
  // left는 컴포넌트에서 동적으로 주입
  bottomTagBox: {
    position: 'absolute',
    bottom: 8,
    paddingHorizontal: 10,
    height: 28,
    backgroundColor: '#F2F3F6',
    justifyContent: 'center',
    zIndex: 1,
  },
  bottomTagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  // 하트(좋아요) 영역 — 카드 내부 우하단
  likeWrap: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
    resizeMode: 'contain',
    tintColor: '#BBBBBB',
  },
  likeCount: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: '#BBBBBB',
  },
});

export default styles;
