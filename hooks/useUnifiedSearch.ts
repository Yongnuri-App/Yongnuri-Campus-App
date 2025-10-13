// hooks/useUnifiedSearch.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUnifiedSearch, Unified as UItem } from '../api/search';
import {
  fetchSearchHistory,
  addSearchHistory,
  deleteSearchHistory,
  deleteAllSearchHistory, // ✅ 추가
} from '../api/searchHistory';

const STORAGE_KEY = 'recent_keywords';
const MAX_RECENTS = 15;

export type Unified = UItem;

function normalizeStr(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export function useUnifiedSearch() {
  const [keyword, setKeyword] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);

  const [results, setResults] = useState<Unified[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const lastQueryRef = useRef<string>('');
  const serverIdsByTextRef = useRef<Map<string, string[]>>(new Map());

  const persistRecent = useCallback(async (list: string[]) => {
    setRecent(list);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.log('최근 검색어 저장 실패:', e);
    }
  }, []);

  const syncServerHistory = useCallback(async () => {
    try {
      const serverHist = await fetchSearchHistory();
      const idsMap = new Map<string, string[]>();
      const orderedUniqueTexts: string[] = [];

      for (const h of serverHist) {
        const text = (h.text || '').trim();
        if (!text) continue;
        const id = h.id?.toString();
        if (id) {
          const arr = idsMap.get(text) ?? [];
          arr.push(id);
          idsMap.set(text, arr);
        }
        if (!orderedUniqueTexts.includes(text)) orderedUniqueTexts.push(text);
      }

      serverIdsByTextRef.current = idsMap;
      const trimmed = orderedUniqueTexts.slice(0, MAX_RECENTS);
      await persistRecent(trimmed);
    } catch (e) {
      console.log('서버 최근검색어 동기화 실패:', e);
    }
  }, [persistRecent]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const local = raw ? JSON.parse(raw) : [];
        if (Array.isArray(local)) setRecent(local);
      } catch (e) {
        console.log('최근 검색어 초기 로드 실패:', e);
      } finally {
        setLoadingRecents(false);
      }
      syncServerHistory();
    })();
  }, [syncServerHistory]);

  const removeRecentOne = useCallback(
    async (word: string) => {
      const next = recent.filter((r) => r !== word);
      await persistRecent(next);

      const ids = serverIdsByTextRef.current.get(word) ?? [];
      if (ids.length > 0) {
        await Promise.allSettled(ids.map((id) => deleteSearchHistory(id)));
        serverIdsByTextRef.current.delete(word);
      }
      await syncServerHistory();
    },
    [recent, persistRecent, syncServerHistory]
  );

  /** ✅ 전체 삭제: 로컬 즉시 비우고 서버 전체 삭제 호출 → 동기화 */
  const clearRecentAll = useCallback(async () => {
    await persistRecent([]);
    serverIdsByTextRef.current.clear();
    // 서버 전체 삭제
    try {
      await deleteAllSearchHistory();
    } catch (e) {
      console.log('서버 전체 최근검색어 삭제 실패:', e);
    }
    // 서버 최신 상태 재반영
    await syncServerHistory();
  }, [persistRecent, syncServerHistory]);

  const searchInternal = useCallback(async (q: string) => {
    return await fetchUnifiedSearch(q);
  }, []);

  const runSearch = useCallback(
    async (raw: string) => {
      const q = normalizeStr(raw);
      if (!q) return;

      lastQueryRef.current = q;

      const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(
        0,
        MAX_RECENTS
      );
      await persistRecent(next);

      addSearchHistory(q)
        .then(() => syncServerHistory())
        .catch((e) => console.log('서버 최근검색어 등록 실패:', e));

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
    },
    [recent, persistRecent, searchInternal, syncServerHistory]
  );

  const refreshResults = useCallback(async () => {
    const q = normalizeStr(lastQueryRef.current);
    if (!q) return;
    try {
      const merged = await searchInternal(q);
      setResults(merged);
    } catch (e) {
      console.log('검색 새로고침 실패:', e);
    }
  }, [searchInternal]);

  return {
    keyword, setKeyword,
    recent, loadingRecents,
    results, loadingResults,
    runSearch,
    refreshResults,
    removeRecentOne,
    clearRecentAll, // ← 이제 서버까지 싹 지움
    lastQueryRef,
  };
}
