// src/api/allNotice.ts
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

export async function postAllNotice(params: { title: string; content: string }) {
  const accessToken = await getAccessTokenStripped();
  const res = await api.post(
    '/board/notices/allnotice',
    { title: params.title, content: params.content },
    { params: { accessToken } }
  );
  return res?.data;
}

export type ServerAllNotice = {
  id?: number | string;
  title?: string;
  content?: string;
  createdAt?: string;
  created_at?: string;
  regDate?: string;
};

export async function fetchAllNotices(): Promise<ServerAllNotice[]> {
  const accessToken = await getAccessTokenStripped();
  try {
    const res = await api.get('/board/notices/allnotice', { params: { accessToken } });
    const data = res?.data;
    if (Array.isArray(data)) return data as ServerAllNotice[];
    if (Array.isArray((data ?? {}).list)) return (data.list as ServerAllNotice[]);
    return [];
  } catch (e: any) {
    // 서버가 500이면 빈 배열 반환(호출측에서 캐시 폴백)
    console.log('[allNotice] GET failed:', e?.response?.status, e?.message);
    return [];
  }
}
