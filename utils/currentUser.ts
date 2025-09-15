// utils/currentUser.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

// 현재 로그인한 이메일(소문자)을 반환
export async function getCurrentUserEmail(): Promise<string> {
  const [[, e1], [, e2]] = await AsyncStorage.multiGet([
    AUTH_EMAIL_KEY,
    AUTH_USER_EMAIL_KEY,
  ]);
  return (e1 || e2 || '').toLowerCase();
}
