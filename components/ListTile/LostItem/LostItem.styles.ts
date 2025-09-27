import { StyleSheet } from 'react-native';

const THUMB = 121;
const GAP = 16;

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

  // ✅ 분실/습득 배지
  badge: {
    width: 32,
    height: 20,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLost: {
    backgroundColor: '#F070C8',
  },
  badgeFound: {
    backgroundColor: '#419EBD',
  },
  badgeRetrieved: {
    backgroundColor: '#979797',
  },
  badgeText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // ✅ 좋아요 영역 (원래대로 오른쪽 끝에 위치)
  likeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 90,
  },
  likeIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
    resizeMode: 'contain',
  },
  likeCount: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: '#979797',
  },

  // ✅ 카드 내부 하단 배지 (절대 배치)
  bottomTagBox: {
    position: 'absolute',
    left: THUMB + GAP,
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
