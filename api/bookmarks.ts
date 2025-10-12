// /api/bookmarks.ts
import { api } from './client';

export type PostType = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY' | 'NOTICE';

export type BookmarkPayload = {
  postType: PostType;
  postId: number;
};

export interface BookmarkResponseDto {
  bookmarkId: number;
  postId: number;
  postType: PostType;
  title: string;
  thumbnailUrl?: string | null;
  bookmarkedAt: string;
}

/** 관심 추가 */
export async function addBookmark(payload: BookmarkPayload): Promise<void> {
  await api.post('/board/bookmarks', payload);
}

/** 관심 삭제 */
export async function removeBookmark(payload: BookmarkPayload): Promise<void> {
  await api.delete('/board/bookmarks', { data: payload });
}

/** 내 관심목록 조회 */
export async function fetchMyBookmarks(
  postType: PostType
): Promise<BookmarkResponseDto[]> {
  const res = await api.get('/board/bookmarks', { params: { postType } });
  return res.data as BookmarkResponseDto[];
}
