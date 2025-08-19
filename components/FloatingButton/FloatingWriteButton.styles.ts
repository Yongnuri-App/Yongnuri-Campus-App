import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    // bottom은 컴포넌트에서 bottomOffset prop으로 주입
    width: 97,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#395884',

    alignItems: 'center',
    justifyContent: 'center',

    // 피그마: box-shadow: 0px 3px 10px rgba(0,0,0,0.1)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 14,
    height: 14,
    marginRight: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});

export default styles;
