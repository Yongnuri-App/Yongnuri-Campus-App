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

/** ------------------------------------------------------------
 * 🔹 StoredUser 타입 (로컬 users_all_v1 구조)
 * -----------------------------------------------------------*/
export type StoredUser = {
  id?: number | string;          // ✅ 추가됨 — 백/로컬에서 id를 쓸 수 있게 허용
  email: string;
  name: string;
  department: string;
  nickname: string;
  password: string;
  studentId?: string;
  isAdmin?: boolean;
  createdAt?: string;
};

const norm = (s?: string | null) => (s ?? '').trim();
const normEmail = (s?: string | null) => norm(s).toLowerCase();

/** 이메일로 users_all_v1에서 최신 프로필 조회 */
export async function getProfileByEmail(email: string) {
  const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
  if (!raw) return null;
  const arr = JSON.parse(raw) as StoredUser[];
  const em = normEmail(email);
  return arr.find(u => u.email?.toLowerCase() === em) ?? null;
}

/** 표시용 이름(닉네임 우선) */
export function toDisplayName(
  u: { name?: string; nickname?: string },
  preferNickname = true
) {
  return preferNickname
    ? (u.nickname || u.name || '')
    : (u.name || u.nickname || '');
}

/** 내부: 값이 있을 때만 multiSet에 추가 */
function pushIf(writes: [string, string][], key: string, value?: string | null) {
  const v = value ?? '';
  if (v !== '') writes.push([key, v]);
}

/** 내부: 기존 닉네임을 최대한 복구 (users_all_v1 → AUTH_NICKNAME_KEY 순) */
async function resolveNickname(emailLower: string, incomingNickname?: string) {
  const cand = norm(incomingNickname);
  if (cand) return cand;

  // 1) users_all_v1
  try {
    const p = await getProfileByEmail(emailLower);
    if (p?.nickname) return String(p.nickname);
  } catch { /* noop */ }

  // 2) AUTH_NICKNAME_KEY
  try {
    const old = await AsyncStorage.getItem(AUTH_NICKNAME_KEY);
    if (old) return old;
  } catch { /* noop */ }

  // 3) 마지막: 빈 문자열 (저장은 하지 않음)
  return '';
}

/** 로그인/회원가입 시 세션을 표준 키 + 구(舊) 호환 키 모두에 저장 (빈 값으로 덮지 않음) */
export async function setSessionFromUser(user: {
  email: string;
  name?: string;
  nickname?: string;
  studentId?: string;
  department?: string;
  token?: string;
  isAdmin?: boolean;
}) {
  const emailLower = normEmail(user.email);
  const token = user.token ?? Math.random().toString(36).slice(2);

  // 닉네임은 파라미터 없으면 기존 저장소에서 최대한 복구
  const nicknameSafe = await resolveNickname(emailLower, user.nickname);

  const writes: [string, string][] = [];
  // 토큰/이메일은 반드시 기록
  pushIf(writes, AUTH_TOKEN_KEY, token);
  pushIf(writes, AUTH_EMAIL_KEY, emailLower);
  pushIf(writes, AUTH_USER_EMAIL_KEY, emailLower); // 호환 키도 같이

  // 아래 필드는 "값 있을 때만" 저장 (빈 값으로 기존 값 덮지 않도록)
  pushIf(writes, AUTH_NAME_KEY, norm(user.name));
  pushIf(writes, AUTH_NICKNAME_KEY, nicknameSafe);
  pushIf(writes, AUTH_STUDENT_ID_KEY, norm(user.studentId));
  pushIf(writes, AUTH_DEPT_KEY, norm(user.department));
  if (user.isAdmin !== undefined) {
    pushIf(writes, AUTH_IS_ADMIN_KEY, user.isAdmin ? 'true' : 'false');
  }

  await AsyncStorage.multiSet(writes);

  // 로컬 ID 없으면 생성 (usePermissions가 사용하는 아이디)
  let uid = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!uid) {
    uid = `local_${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, uid);
  }
}

/** 세션/호환 키 모두 제거 — ⚠️ 닉네임은 보존 */
export async function clearSession() {
  await AsyncStorage.multiRemove([
    AUTH_TOKEN_KEY,
    AUTH_EMAIL_KEY,
    AUTH_USER_EMAIL_KEY,
    AUTH_NAME_KEY,
    // AUTH_NICKNAME_KEY, // ❌ 닉네임 보존
    AUTH_STUDENT_ID_KEY,
    AUTH_DEPT_KEY,
    AUTH_IS_ADMIN_KEY,
  ]);
}
