import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  bottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDEDED',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  labelActive: {
    // 활성 텍스트는 기본 700 유지
  },
  underline: {
    height: 2,
    borderRadius: 2,
    marginTop: 2,
  },
});
