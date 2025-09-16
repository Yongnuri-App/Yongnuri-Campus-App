import { StyleSheet } from 'react-native';

const COLORS = {
  primary: '#395884',
  textOnPrimary: '#FFFFFF',
  disabledBg: '#979797',
  disabledText: '#9CA3AF',
};

export default StyleSheet.create({
  button: {
    width: 70,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabledBg,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
});
