// api/searchHistory.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

export type HistoryRow =
  | string
  | { id?: string | number; searchId?: string | number; query?: string; keyword?: string; createdAt?: string };

export type HistoryItem = { id?: string; text: string; createdAt?: string };

const getToken = async () =>
  (await AsyncStorage.getItem('accessToken')) ||
  (await AsyncStorage.getItem('access_token')) ||
  undefined;

export async function fetchSearchHistory(params?: { searchId?: string; query?: string }) {
  const token = await getToken();
  const res = await api.get<HistoryRow[]>('/search/history', {
    params,
    headers: token ? { accessToken: token.replace(/^Bearer\s+/i, '') } : undefined,
  });
  const rows = Array.isArray(res.data) ? res.data : [];
  return rows.map((r) => {
    if (typeof r === 'string') return { text: r } as HistoryItem;
    const text = r.query ?? r.keyword ?? '';
    const id = (r.id ?? r.searchId)?.toString();
    return { id, text, createdAt: r.createdAt } as HistoryItem;
  });
}

export async function addSearchHistory(query: string) {
  const token = await getToken();
  const res = await api.post(
    '/search/history',
    { query },
    {
      headers: {
        ...(token ? { accessToken: token.replace(/^Bearer\s+/i, '') } : {}),
        'Content-Type': 'application/json',
      },
    }
  );
  return res.status >= 200 && res.status < 300;
}

export async function deleteSearchHistory(searchId: string | number) {
  const token = await getToken();
  const res = await api.delete(`/search/history/${searchId}`, {
    headers: token ? { accessToken: token.replace(/^Bearer\s+/i, '') } : undefined,
  });
  return res.status >= 200 && res.status < 300;
}

/** ✅ 전체 삭제: 엔드포인트 실패 시 개별 삭제로 폴백 */
export async function deleteAllSearchHistory() {
  const token = await getToken();

  // 1) 우선 서버의 전체 삭제 엔드포인트 시도
  try {
    const res = await api.delete('/search/history', {
      headers: token ? { accessToken: token.replace(/^Bearer\s+/i, '') } : undefined,
    });
    if (res.status >= 200 && res.status < 300) return true;
  } catch (e) {
    console.log('[deleteAllSearchHistory] 전체삭제 시도 실패, 폴백으로 전환:', e);
  }

  // 2) 폴백: 전체 목록을 불러와 개별 삭제
  try {
    const listRes = await api.get<HistoryRow[]>('/search/history', {
      headers: token ? { accessToken: token.replace(/^Bearer\s+/i, '') } : undefined,
    });
    const rows = Array.isArray(listRes.data) ? listRes.data : [];
    const ids = rows
      .map((r) => (typeof r === 'string' ? undefined : (r.id ?? r.searchId)))
      .filter((v) => v != null)
      .map((v) => String(v));

    if (ids.length === 0) return true;

    // 병렬 삭제 (너무 많으면 서버 보호를 위해 배치 크기 조절 가능)
    const results = await Promise.allSettled(ids.map((id) => deleteSearchHistory(id)));
    const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value !== true));
    if (failed.length > 0) {
      console.log(`[deleteAllSearchHistory] 일부 항목 삭제 실패: ${failed.length}/${ids.length}`);
    }
    return failed.length === 0; // 전부 성공했는지 여부 반환
  } catch (e) {
    console.log('[deleteAllSearchHistory] 폴백 중 오류:', e);
    return false;
  }
}
