// pages/PasswordReset/PasswordResetPage.styles.ts
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    position: 'relative',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
    // marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
    marginTop: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    width: '100%',
    height: 47,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
    paddingRight: 40, // correct.png 공간 확보
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: 10,
  },
  correctIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    width: 24,
    height: 24,
    transform: [{ translateY: -17 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  subButton: {
    width: 94,
    height: 47,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#979797',
  },
  signUpButton: {
    marginTop: 20,
    width: '100%',
    height: 50,
    backgroundColor: '#395884',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default styles;
