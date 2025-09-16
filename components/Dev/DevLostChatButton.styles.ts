import { StyleSheet } from 'react-native';

const COLORS = {
  border: '#E5E7EB',
  bg: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  blue: '#395884',
  gray: '#4B5563',
};

export default StyleSheet.create({
  devBox: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  owner: {
    backgroundColor: COLORS.blue,
  },
  guest: {
    backgroundColor: COLORS.gray,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.sub,
  },
});
