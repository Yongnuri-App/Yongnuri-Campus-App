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

/** 백엔드 알림 응답 스키마 (최신) */
export type ServerNotification = {
  id?: string | number;
  title?: string;          // 예: "새 공지사항: ..."
  message?: string;        // 본문(이전 content -> message)
  createdAt?: string;      // ISO
  chatType?: string | null;
  typeId?: number | null;
  read?: boolean;          // 읽음 여부
};

/** 개인 알림 조회: GET /notifications?accessToken=... */
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
