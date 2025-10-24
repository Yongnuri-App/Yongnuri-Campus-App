// components/ListTile/LostItem/LostItem.styles.ts
import { StyleSheet } from 'react-native';

export const THUMB = 121;
export const GAP = 16;

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
    position: 'relative', // ✅ bottomTag용 기준
  },
  thumbnail: {
    width: THUMB,
    height: 121,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
  },
  info: {
    flex: 1,
    marginLeft: GAP,
    justifyContent: 'center',
    marginBottom: 60,
  },
  title: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 20,
    color: '#212124',
    marginLeft: 6, // 뱃지와 텍스트 사이
  },
  subtitle: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 15,
    color: '#979797',
    marginTop: 4,
  },

  // ✅ 분실/습득/회수 배지
  badge: {
    minWidth: 32,
    height: 20,
    borderRadius: 5,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLost: { backgroundColor: '#F070C8' },
  badgeFound: { backgroundColor: '#419EBD' },
  badgeRetrieved: { backgroundColor: '#979797' },
  badgeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // ✅ 좋아요 영역 (오른쪽 하단 고정)
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

  // ✅ 카드 내부 하단 배지 (절대 배치) — left는 컴포넌트에서 동적으로 주입
  bottomTagBox: {
    position: 'absolute',
    bottom: 8,
    paddingHorizontal: 10,
    height: 28,
    backgroundColor: '#F2F3F6',
    justifyContent: 'center',
  },
  bottomTagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default styles;
