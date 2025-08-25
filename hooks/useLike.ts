// hooks/useLike.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

type UseLikeOptions = {
  /** 게시글 id */
  itemId: string;
  /** 좋아요 맵( { [id]: boolean } ) 저장 키 */
  likedMapKey: string;
  /** 목록 동기화가 필요하면 게시글 리스트 키 (예: 'market_posts_v1') */
  postsKey?: string;
  /** 초기 likeCount (상세 불러온 뒤 동기화할 수 있도록 선택값) */
  initialCount?: number;
};

export function useLike({
  itemId,
  likedMapKey,
  postsKey,
  initialCount = 0,
}: UseLikeOptions) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(initialCount);
  const [ready, setReady] = useState(false);

  // 초기 liked 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(likedMapKey);
        const map = raw ? JSON.parse(raw) : {};
        if (mounted) {
          setLiked(!!map?.[itemId]);
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [itemId, likedMapKey]);

  // 상세에서 불러온 likeCount를 훅으로 주입해 동기화
  const syncCount = useCallback((count: number | undefined | null) => {
    setLikeCount(Number(count ?? 0));
  }, []);

  // 좋아요 상태/카운트 영속 & 목록 동기화
  const setLikedPersisted = useCallback(
    async (nextLiked: boolean) => {
      // 1) 맵 저장
      const raw = await AsyncStorage.getItem(likedMapKey);
      const map = raw ? JSON.parse(raw) : {};
      map[itemId] = nextLiked;
      await AsyncStorage.setItem(likedMapKey, JSON.stringify(map));

      // 2) 로컬 상태 갱신 (delta 계산)
      setLiked(prev => {
        const delta = nextLiked === prev ? 0 : nextLiked ? 1 : -1;
        setLikeCount(c => Math.max(0, c + delta));
        return nextLiked;
      });

      // 3) 목록(리스트) 동기화
      if (postsKey) {
        try {
          const listRaw = await AsyncStorage.getItem(postsKey);
          const list = listRaw ? JSON.parse(listRaw) : [];
          const idx = Array.isArray(list) ? list.findIndex((p: any) => p?.id === itemId) : -1;
          if (idx >= 0) {
            const prevCount = Number(list[idx]?.likeCount ?? 0);
            const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
            list[idx] = { ...list[idx], likeCount: nextCount };
            await AsyncStorage.setItem(postsKey, JSON.stringify(list));
          }
        } catch {}
      }
    },
    [itemId, likedMapKey, postsKey]
  );

  return {
    ready,          // 초기 로드 완료 여부 (필요 시 사용)
    liked,          // 현재 좋아요 여부
    likeCount,      // 현재 카운트
    syncCount,      // 상세에서 받은 likeCount를 동기화할 때 사용
    setLikedPersisted, // onToggleLike에서 그대로 넘겨 호출
  };
}

export default useLike;
