// pages/Login/LoginScreen.styles.ts
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 120,
  },
  logo: {
    width: 164,
    height: 149,
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '700',
    color: '#395884',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 50,
    fontSize: 12,
    fontWeight: '500',
    color: '#979797',
    textAlign: 'center',
  },
  input: {
    width: Math.min(width * 0.85, 320),
    height: 48,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 50,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  loginButton: {
    width: Math.min(width * 0.85, 320),
    height: 48,
    backgroundColor: '#395884',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    gap: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#979797',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#979797',
  },
});

export default styles;
