import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

export type LocalIdentity = {
  userId: string | null;
  userEmail: string | null;
};

/** 존재하지 않으면 생성해서 반환 */
export async function ensureLocalIdentity(): Promise<LocalIdentity> {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const userEmail = (await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY)) ?? null;
  return { userId, userEmail };
}

/** 읽기만 (없으면 null 유지) */
export async function getLocalIdentity(): Promise<LocalIdentity> {
  const [userId, userEmail] = await Promise.all([
    AsyncStorage.getItem(AUTH_USER_ID_KEY),
    AsyncStorage.getItem(AUTH_USER_EMAIL_KEY),
  ]);
  return { userId, userEmail };
}
