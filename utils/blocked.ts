// utils/blocked.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/** ✅ AsyncStorage 키 */
const KEY = 'blocked_users_v1';

export type BlockedUser = {
  id: string;           // 상대 사용자 ID (숫자/문자열)
  name: string;         // 표시용 닉네임
  dept?: string;
  avatarUri?: string;
  blockedAt?: number;   // ✅ 차단 시각(ms). 이 이후 상대 메시지 차단
};

/** 내부: 안전 로드 */
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

/** ✅ 전체 목록 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  return readAll();
}

/** ✅ 차단 여부 */
export async function isBlockedUser(opponentId?: string | null): Promise<boolean> {
  if (!opponentId) return false;
  const id = String(opponentId);
  const list = await readAll();
  return list.some(u => u.id === id);
}

/** ✅ 차단 시각 (없으면 null) */
export async function getBlockedAt(opponentId?: string | null): Promise<number | null> {
  if (!opponentId) return null;
  const id = String(opponentId);
  const list = await readAll();
  const hit = list.find(u => u.id === id);
  return hit?.blockedAt ?? null;
}

/** ✅ 차단 추가(중복 방지) + blockedAt 기록 */
export async function blockUser(user: BlockedUser): Promise<void> {
  const list = await readAll();
  const idx = list.findIndex(u => u.id === user.id);
  const now = Date.now();
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = { ...prev, ...user, blockedAt: prev.blockedAt ?? user.blockedAt ?? now };
    await writeAll(list);
    return;
  }
  await writeAll([{ ...user, blockedAt: user.blockedAt ?? now }, ...list]);
}

/** ✅ 차단 해제 */
export async function unblockUser(userId: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter(u => u.id !== userId));
}
