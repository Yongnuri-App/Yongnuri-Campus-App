// utils/blocked.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/** ✅ AsyncStorage 키 (버전 표기: 스키마 바뀌면 v2로) */
const KEY = 'blocked_users_v1';

/** 차단 사용자 타입
 * - id: 백엔드/프로필의 고유 식별자(가능하면 숫자/UUID)
 * - name: 표시용 이름(닉네임)
 * - dept/avatarUri: 선택
 */
export type BlockedUser = {
  id: string;
  name: string;
  dept?: string;
  avatarUri?: string;
};

/** 내부: 안전 파싱 */
async function readAll(): Promise<BlockedUser[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** 내부: 저장 */
async function writeAll(next: BlockedUser[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/** ✅ 전체 차단 목록 조회 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  return readAll();
}

/** ✅ 특정 사용자 차단 여부 조회
 * - 주로 ChatRoom에서 opponent.id로 체크
 */
export async function isBlockedUser(opponentId?: string | null): Promise<boolean> {
  if (!opponentId) return false;
  const id = String(opponentId);
  const list = await readAll();
  return list.some(u => u.id === id);
}

/** ✅ 차단 추가 (중복 방지) */
export async function blockUser(user: BlockedUser): Promise<void> {
  const list = await readAll();
  const exists = list.some(u => u.id === user.id);
  if (exists) return; // 이미 차단됨

  const next = [user, ...list]; // 최근 차단 상위
  await writeAll(next);
}

/** ✅ 차단 해제 */
export async function unblockUser(userId: string): Promise<void> {
  const list = await readAll();
  const next = list.filter(u => u.id !== userId);
  await writeAll(next);
}
