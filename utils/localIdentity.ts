// src/utils/localIdentity.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 표준/레거시 키 정리
 * - AUTH_SERVER_USER_ID : 백엔드 실제 사용자 ID(문자/숫자)
 * - AUTH_EMAIL          : 소문자로 정규화된 로그인 이메일(표준)
 * - AUTH_DEVICE_ID      : 로컬(디바이스) 식별자, 서버 ID 없을 때 Fallback
 *
 * 레거시 호환:
 * - AUTH_USER_EMAIL_KEY : 'auth_user_email'
 * - AUTH_USER_ID_KEY    : 'auth_user_id'  (= AUTH_DEVICE_ID 와 동일 키)
 */
export const AUTH_SERVER_USER_ID = 'auth_server_user_id';
export const AUTH_EMAIL = 'auth_email';
export const AUTH_DEVICE_ID = 'auth_user_id'; // 기존 호환 그대로 사용

// 레거시 키 (과거 코드 호환용)
export const AUTH_USER_EMAIL_KEY = 'auth_user_email';
export const AUTH_USER_ID_KEY = 'auth_user_id';

export type LocalIdentity = {
  /** 우선순위: 서버 userId → 없으면 deviceId */
  userId: string | null;
  /** 소문자 정규화된 이메일 */
  userEmail: string | null;
};

export const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

/** 존재하지 않으면 기기용 ID 생성 */
async function ensureDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(AUTH_DEVICE_ID);
  if (!id) {
    id = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    // 표준/레거시 동일 키이므로 한 번만 저장
    await AsyncStorage.setItem(AUTH_DEVICE_ID, id);
  }
  return id;
}

/** 내부: 이메일을 표준/레거시 양쪽 모두에 저장 */
async function saveEmailBoth(normalizedEmail: string | null) {
  if (normalizedEmail && normalizedEmail.length > 0) {
    await AsyncStorage.multiSet([
      [AUTH_EMAIL, normalizedEmail],
      [AUTH_USER_EMAIL_KEY, normalizedEmail], // 레거시 호환
    ]);
  } else {
    await AsyncStorage.multiRemove([AUTH_EMAIL, AUTH_USER_EMAIL_KEY]);
  }
}

/** 내부: 서버 ID 저장/제거 */
async function saveServerId(id: string | number | null | undefined) {
  if (id != null) {
    await AsyncStorage.setItem(AUTH_SERVER_USER_ID, String(id));
  } else {
    await AsyncStorage.removeItem(AUTH_SERVER_USER_ID);
  }
}

/** ✅ 로그인 성공 시 호출: 서버 userId/email 을 저장 (표준 API) */
export async function setAuthIdentity(opts: { userId?: string | number | null; email?: string | null }) {
  const emailNormalized = opts.email != null ? normEmail(opts.email) : null;
  await Promise.all([saveServerId(opts.userId ?? null), saveEmailBoth(emailNormalized)]);
}

/**
 * ✅ 과거 코드 호환용 SHIM
 * - 기존 파일들이 `setAuthEmailNormalized(email)` 를 호출하던 것을 살리기 위해 제공
 * - 표준/레거시 키 모두에 저장
 */
export async function setAuthEmailNormalized(email: string | null) {
  const normalized = email ? normEmail(email) : null;
  await saveEmailBoth(normalized);
}

/** 편의: 이메일만 저장하는 별칭 (호환) */
export async function setAuthEmail(email: string | null) {
  await setAuthEmailNormalized(email);
}

/**
 * ✅ 읽기 (존재 보장 X)
 * - 표준 키를 우선 읽되, 레거시 키도 함께 참조
 * - userId : 서버 ID가 있으면 그걸, 없으면 deviceId
 * - userEmail : 표준/레거시 중 하나라도 있으면 사용
 */
export async function getLocalIdentity(): Promise<LocalIdentity> {
  // 표준 + 레거시 멀티 read
  const entries = await AsyncStorage.multiGet([
    AUTH_SERVER_USER_ID,
    AUTH_EMAIL,
    AUTH_USER_EMAIL_KEY,
  ]);

  const serverId = entries.find(([k]) => k === AUTH_SERVER_USER_ID)?.[1] ?? null;
  const emailStd = entries.find(([k]) => k === AUTH_EMAIL)?.[1] ?? null;
  const emailLegacy = entries.find(([k]) => k === AUTH_USER_EMAIL_KEY)?.[1] ?? null;

  const userEmail = normEmail(emailStd || emailLegacy) || null;
  const deviceId = await ensureDeviceId();
  const userId = serverId || deviceId || null;

  return { userId, userEmail };
}

/**
 * ✅ ensureLocalIdentity
 * - 과거 코드가 “없으면 생성” 의미로 사용하던 함수 호환
 * - getLocalIdentity와 동일하지만 이름 호환을 위해 제공
 */
export async function ensureLocalIdentity(): Promise<LocalIdentity> {
  return getLocalIdentity();
}

/** ✅ 개인 스코프 문자열: 이메일 우선, 없으면 deviceId */
export async function getIdentityScope(): Promise<string | null> {
  const { userId, userEmail } = await getLocalIdentity();
  return userEmail || userId;
}

/** 비교 유틸 */
export const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && normEmail(a) === normEmail(b);
export const sameId = (a?: string | number | null, b?: string | number | null) =>
  a != null && b != null && String(a) === String(b);
