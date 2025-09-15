// utils/session.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_NAME_KEY = 'auth_user_name';
export const AUTH_NICKNAME_KEY = 'auth_user_nickname';
export const AUTH_STUDENT_ID_KEY = 'auth_student_id';
export const AUTH_EMAIL_KEY = 'auth_email';           // 신규 코드들이 쓰는 키
export const AUTH_DEPT_KEY = 'auth_department';
export const AUTH_IS_ADMIN_KEY = 'auth_is_admin';

// ✅ 과거 코드 호환용 (usePermissions 등에서 참조)
export const AUTH_USER_ID_KEY = 'auth_user_id';
export const AUTH_USER_EMAIL_KEY = 'auth_user_email';

export const USERS_ALL_KEY = 'users_all_v1';

export type StoredUser = {
  email: string;
  name: string;
  department: string;
  nickname: string;
  password: string;
  studentId?: string;
  isAdmin?: boolean;
  createdAt?: string;
};

/** 로그인/회원가입 시 세션을 표준 키 + 구(舊) 호환 키 모두에 저장 */
export async function setSessionFromUser(user: {
  email: string;
  name?: string;
  nickname?: string;
  studentId?: string;
  department?: string;
  token?: string;
  isAdmin?: boolean;
}) {
  const token = user.token ?? Math.random().toString(36).slice(2);

  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_EMAIL_KEY, user.email ?? ''],
    [AUTH_USER_EMAIL_KEY, user.email ?? ''],  // ← 호환 키도 같이
    [AUTH_NAME_KEY, user.name ?? ''],
    [AUTH_NICKNAME_KEY, user.nickname ?? ''],
    [AUTH_STUDENT_ID_KEY, user.studentId ?? ''],
    [AUTH_DEPT_KEY, user.department ?? ''],
    [AUTH_IS_ADMIN_KEY, user.isAdmin ? 'true' : 'false'],
  ]);

  // 로컬 ID 없으면 생성 (usePermissions가 사용하는 아이디)
  let uid = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!uid) {
    uid = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, uid);
  }
}

/** 세션/호환 키 모두 제거 */
export async function clearSession() {
  await AsyncStorage.multiRemove([
    AUTH_TOKEN_KEY,
    AUTH_EMAIL_KEY,
    AUTH_USER_EMAIL_KEY,
    AUTH_NAME_KEY,
    AUTH_NICKNAME_KEY,
    AUTH_STUDENT_ID_KEY,
    AUTH_DEPT_KEY,
    AUTH_IS_ADMIN_KEY,
  ]);
}

/** 이메일로 users_all_v1에서 최신 프로필 조회 */
export async function getProfileByEmail(email: string) {
  const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
  if (!raw) return null;
  const arr = JSON.parse(raw) as StoredUser[];
  return arr.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

/** 표시용 이름(닉네임 우선) */
export function toDisplayName(u: { name?: string; nickname?: string }, preferNickname = true) {
  return preferNickname ? (u.nickname || u.name || '') : (u.name || u.nickname || '');
}
