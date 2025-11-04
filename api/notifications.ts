// src/api/notifications.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

function stripBearer(v?: string | null) {
  if (!v) return '';
  return v.startsWith('Bearer ') ? v.slice('Bearer '.length) : v;
}
async function getAccessTokenStripped() {
  const raw =
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('access_token')) ||
    (await AsyncStorage.getItem('auth_token')) ||
    '';
  return stripBearer(raw);
}

/** 백엔드 알림 응답 스키마 (참고용) */
export type ServerNotification = {
  id?: string | number;
  title?: string;
  message?: string;
  createdAt?: string;
  chatType?: string | null;
  typeId?: number | null;
  read?: boolean;
};

export async function fetchNotifications(): Promise<ServerNotification[]> {
  const accessToken = await getAccessTokenStripped();
  try {
    const res = await api.get('/notifications', { params: { accessToken } });
    const data = res?.data;
    return Array.isArray(data) ? (data as ServerNotification[]) : [];
  } catch (e: any) {
    console.log('[notifications] GET failed:', e?.response?.status, e?.message);
    return [];
  }
}

/** ✅ 안 읽은 알림 개수: GET /notifications/unread/count?accessToken=... */
export async function fetchUnreadCount(): Promise<number | null> {
  const accessToken = await getAccessTokenStripped();
  try {
    const res = await api.get('/notifications/unread/count', { params: { accessToken } });
    const n = res?.data;
    if (typeof n === 'number') return n;
    // 서버가 {count: number} 형태라면 아래처럼 처리
    if (n && typeof n.count === 'number') return n.count;
    return 0;
  } catch (e: any) {
    console.log('[notifications] unread count GET failed:', e?.response?.status, e?.message);
    return null; // 폴백 유도
  }
}
