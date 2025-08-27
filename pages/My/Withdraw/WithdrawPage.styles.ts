import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -40,
  },
  statusBar: {
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#1E1E1E',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 22,
    color: '#1E1E1E',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 17,
    color: '#1E1E1E',
    marginBottom: 12,
  },
  desc: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 20,
    color: '#797979',
    marginBottom: 32,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#1E1E1E',
  },
  withdrawBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
