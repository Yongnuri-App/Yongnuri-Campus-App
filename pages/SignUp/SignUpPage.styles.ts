// pages/SignUp/SignUpPage.styles.ts
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

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
  backButton: {
    marginBottom: 20,
    width: 24,
    height: 24,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 15,
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
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
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  correctIcon: {
    position: 'absolute',
    right: 12, // 인풋 오른쪽 안쪽 위치
    top: '50%',
    width: 24,
    height: 24,
    transform: [{ translateY: -17 }], // 세로 중앙 정렬
  },
  signUpButton: {
    marginTop: 30,
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
