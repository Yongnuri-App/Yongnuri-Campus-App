// hooks/useUnifiedSearch.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MARKET_KEY = 'market_posts_v1';
export const LOST_KEY = 'lost_found_posts_v1';
export const GROUP_KEY = 'groupbuy_posts_v1';
export const NOTICE_KEY = 'notice_posts_v1';

const STORAGE_KEY = 'recent_keywords';
const MAX_RECENTS = 15;

export type Unified =
  | { kind: 'market'; id: string; data: any }
  | { kind: 'lost'; id: string; data: any }
  | { kind: 'group'; id: string; data: any }
  | { kind: 'notice'; id: string; data: any };

function normalize(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function getSortTime(u: Unified) {
  if (u.kind === 'notice') {
    return new Date(u.data?.createdAt ?? u.data?.startDate ?? 0).getTime();
  }
  return new Date(u.data?.createdAt ?? 0).getTime();
}

export function useUnifiedSearch() {
  const [keyword, setKeyword] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);

  const [results, setResults] = useState<Unified[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const lastQueryRef = useRef<string>('');

  // ── 최근검색어 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setRecent(parsed);
      } catch (e) {
        console.log('최근 검색어 로드 실패:', e);
      } finally {
        setLoadingRecents(false);
      }
    })();
  }, []);

  const persistRecent = useCallback(async (list: string[]) => {
    setRecent(list);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.log('최근 검색어 저장 실패:', e);
    }
  }, []);

  const removeRecentOne = useCallback((word: string) => {
    const next = recent.filter(r => r !== word);
    persistRecent(next);
  }, [recent, persistRecent]);

  const clearRecentAll = useCallback(async () => {
    await persistRecent([]);
  }, [persistRecent]);

  // ── 공통: 스토리지 읽고 필터 후 병합
  const searchInternal = useCallback(async (q: string) => {
    const [mRaw, lRaw, gRaw, nRaw] = await Promise.all([
      AsyncStorage.getItem(MARKET_KEY),
      AsyncStorage.getItem(LOST_KEY),
      AsyncStorage.getItem(GROUP_KEY),
      AsyncStorage.getItem(NOTICE_KEY),
    ]);

    const markets = (mRaw ? JSON.parse(mRaw) : []) as any[];
    const losts   = (lRaw ? JSON.parse(lRaw) : []) as any[];
    const groups  = (gRaw ? JSON.parse(gRaw) : []) as any[];
    const notices = (nRaw ? JSON.parse(nRaw) : []) as any[];

    const qLower = q.toLowerCase();

    const hitMarket: Unified[] = markets
      .filter(it => (`${it.title ?? ''} ${it.description ?? ''}`).toLowerCase().includes(qLower))
      .map(it => ({ kind: 'market', id: it.id, data: it }));

    const hitLost: Unified[] = losts
      .filter(it => (`${it.title ?? ''} ${it.content ?? ''}`).toLowerCase().includes(qLower))
      .map(it => ({ kind: 'lost', id: it.id, data: it }));

    const hitGroup: Unified[] = groups
      .filter(it => (`${it.title ?? ''} ${it.description ?? ''}`).toLowerCase().includes(qLower))
      .map(it => ({ kind: 'group', id: it.id, data: it }));

    const hitNotice: Unified[] = notices
      .filter(it => (`${it.title ?? ''} ${it.description ?? ''}`).toLowerCase().includes(qLower))
      .map(it => ({ kind: 'notice', id: it.id, data: it }));

    const merged = [...hitMarket, ...hitLost, ...hitGroup, ...hitNotice]
      .sort((a, b) => getSortTime(b) - getSortTime(a));

    return merged;
  }, []);

  // ── 검색 실행(최근검색어 업데이트 포함)
  const runSearch = useCallback(async (raw: string) => {
    const q = normalize(raw);
    if (!q) return;

    lastQueryRef.current = q;

    const next = [q, ...recent.filter(r => r.toLowerCase() !== q.toLowerCase())]
      .slice(0, MAX_RECENTS);
    await persistRecent(next);

    setLoadingResults(true);
    try {
      const merged = await searchInternal(q);
      setResults(merged);
    } catch (e) {
      console.log('검색 실패:', e);
      setResults([]);
      throw e;
    } finally {
      setLoadingResults(false);
    }
  }, [recent, persistRecent, searchInternal]);

  // ── 화면 복귀 시 최신 데이터 기준 재검색(최근검색어는 유지)
  const refreshResults = useCallback(async () => {
    const q = normalize(lastQueryRef.current);
    if (!q) return;
    try {
      const merged = await searchInternal(q);
      setResults(merged);
    } catch (e) {
      console.log('검색 새로고침 실패:', e);
    }
  }, [searchInternal]);

  return {
    // state
    keyword, setKeyword,
    recent, loadingRecents,
    results, loadingResults,

    // actions
    runSearch,
    refreshResults,
    removeRecentOne,
    clearRecentAll,

    // expose for external use if needed
    lastQueryRef,
  };
}
