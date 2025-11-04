// src/utils/alarmStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AlarmRow = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;      // ISO
  reportIcon?: boolean;   // 신고 알림이면 true
};

// === 키 규약 ===
export const ALARM_BROADCAST_KEY = 'alarm_list_v1';
export const ALARM_USER_LIST_BASE = 'alarm_user_list_v1';
export const SEEN_BASE = 'alarm_seen_until_v1';

export const userListKey = (identity: string) =>
  `${ALARM_USER_LIST_BASE}__id:${identity}`;
export const seenKeyByIdentity = (identity: string) =>
  `${SEEN_BASE}__id:${identity}`;

// === 브로드캐스트(전체 공지) ===
export async function addBroadcast(item: AlarmRow) {
  const raw = await AsyncStorage.getItem(ALARM_BROADCAST_KEY);
  const list: AlarmRow[] = raw ? JSON.parse(raw) : [];
  list.unshift(item);
  await AsyncStorage.setItem(ALARM_BROADCAST_KEY, JSON.stringify(list));
}

export async function loadBroadcast(): Promise<AlarmRow[]> {
  const raw = await AsyncStorage.getItem(ALARM_BROADCAST_KEY);
  const list: AlarmRow[] = raw ? JSON.parse(raw) : [];
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

/** 🔥 서버에서 받은 공지로 브로드캐스트 전체를 교체 저장 */
export async function setBroadcast(list: AlarmRow[]) {
  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  await AsyncStorage.setItem(ALARM_BROADCAST_KEY, JSON.stringify(sorted));
}

// === 개인 알림 ===
export async function addUserAlarm(identity: string, item: AlarmRow) {
  const key = userListKey(identity);
  const raw = await AsyncStorage.getItem(key);
  const list: AlarmRow[] = raw ? JSON.parse(raw) : [];
  list.unshift(item);
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

export async function loadUserAlarms(identity: string): Promise<AlarmRow[]> {
  const key = userListKey(identity);
  const raw = await AsyncStorage.getItem(key);
  const list: AlarmRow[] = raw ? JSON.parse(raw) : [];
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

// === 유틸 ===
export function mergeSortAlarms(...lists: AlarmRow[][]): AlarmRow[] {
  const merged: AlarmRow[] = ([] as AlarmRow[]).concat(...lists);
  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged;
}

export const uniqId = (p = 'alarm') =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function pushPersonalAlarm(
  identity: string,
  row: Omit<AlarmRow, 'id' | 'createdAt'> &
    Partial<Pick<AlarmRow, 'id' | 'createdAt'>>
) {
  const item: AlarmRow = {
    id: row.id ?? uniqId(),
    title: row.title,
    description: row.description,
    createdAt: row.createdAt ?? new Date().toISOString(),
    ...(row.reportIcon ? { reportIcon: true } : {}),
  };
  await addUserAlarm(identity, item);
}
