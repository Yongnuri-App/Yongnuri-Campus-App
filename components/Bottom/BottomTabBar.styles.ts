import { Platform, StyleSheet } from 'react-native';

/**
 * 피그마 기준(높이 86, 그림자) + 모바일 네비게이션바와 겹침 방지 padding
 * - iOS: shadow*
 * - Android: elevation
 */
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,  // 화면 하단 고정
    height: 90,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',

    // 그림자
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: -1 },
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),

    // 하단 소프트키/홈바와 겹침 방지
    paddingBottom: Platform.OS === 'android' ? 8 : 12,
  },
  tab: {
    width: 64,                 // 각 탭의 터치 영역 (여백 포함)
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 29,
    height: 29,
    marginBottom: 6,
  },
  label: {
    fontFamily: Platform.select({ ios: 'System', android: 'System' }),
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 15,
  },
  labelActive: {
    color: '#323232',
  },
  labelInactive: {
    color: '#979797',
  },
});

export default styles;
