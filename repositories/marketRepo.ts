// repositories/marketRepo.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MarketPostLite = {
  id: string;
  likeCount?: number;
  // 필요한 필드가 더 있다면 추가
};

/**
 * 게시글 목록(POSTS_KEY) 중 특정 postId의 좋아요 개수를 갱신
 */
export async function updatePostLikeCountInList(
  postsKey: string,
  postId: string,
  nextCount: number
): Promise<void> {
  const raw = await AsyncStorage.getItem(postsKey);
  const list: MarketPostLite[] = raw ? JSON.parse(raw) : [];
  const idx = list.findIndex(p => p.id === postId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], likeCount: nextCount };
  await AsyncStorage.setItem(postsKey, JSON.stringify(list));
}
