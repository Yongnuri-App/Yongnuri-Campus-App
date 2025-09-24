// utils/localIdentity.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 스토리지 키(표준 + 구키 호환) */
export const AUTH_USER_ID_KEY = 'auth_user_id';
export const AUTH_EMAIL_KEY = 'auth_email';           // 표준
export const AUTH_USER_EMAIL_KEY = 'auth_user_email'; // 구키(호환)

export type LocalIdentity = {
  userId: string | null;   // 기기 고유 ID
  userEmail: string | null; // 소문자 정규화된 이메일
};

export const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

export async function ensureLocalIdentity(): Promise<LocalIdentity> {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const results = await AsyncStorage.multiGet([AUTH_EMAIL_KEY, AUTH_USER_EMAIL_KEY]);
  const emailStd = results.find(([k]) => k === AUTH_EMAIL_KEY)?.[1] ?? null;
  const emailCompat = results.find(([k]) => k === AUTH_USER_EMAIL_KEY)?.[1] ?? null;
  const userEmail = normEmail(emailStd || emailCompat) || null;
  return { userId, userEmail };
}

export async function getLocalIdentity(): Promise<LocalIdentity> {
  const results = await AsyncStorage.multiGet([AUTH_USER_ID_KEY, AUTH_EMAIL_KEY, AUTH_USER_EMAIL_KEY]);
  const userId = results.find(([k]) => k === AUTH_USER_ID_KEY)?.[1] ?? null;
  const emailStd = results.find(([k]) => k === AUTH_EMAIL_KEY)?.[1] ?? null;
  const emailCompat = results.find(([k]) => k === AUTH_USER_EMAIL_KEY)?.[1] ?? null;
  const userEmail = normEmail(emailStd || emailCompat) || null;
  return { userId, userEmail };
}

export const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && normEmail(a) === normEmail(b);
export const sameId = (a?: string | number | null, b?: string | number | null) =>
  a != null && b != null && String(a) === String(b);

/** ✅ 로그인 성공 시 호출: 이메일 저장/갱신 (표준/구키 모두) */
export async function setAuthEmailNormalized(email: string | null) {
  const v = email ? normEmail(email) : null;
  if (v) {
    await AsyncStorage.multiSet([
      [AUTH_EMAIL_KEY, v],
      [AUTH_USER_EMAIL_KEY, v],
    ]);
  } else {
    await AsyncStorage.multiRemove([AUTH_EMAIL_KEY, AUTH_USER_EMAIL_KEY]);
  }
}

/** ✅ 알림 등의 개인 스코프 키에 사용할 "아이덴티티 문자열" (email 우선, 없으면 userId) */
export async function getIdentityScope(): Promise<string | null> {
  const { userId, userEmail } = await ensureLocalIdentity();
  const identity = normEmail(userEmail) || userId || null;
  return identity;
}
