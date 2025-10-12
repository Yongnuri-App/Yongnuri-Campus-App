// /api/bookmarks.ts
// Bookmark(관심목록) API. 서버 컨트롤러: BookmarkController (/board/bookmarks)

import { api } from './client';

export type PostType = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY' | 'NOTICE';

export type BookmarkPayload = {
  postType: PostType;
  postId: number;
};

/** 관심 추가 (이미 있으면 200 + "이미 관심…" 메시지) */
export async function addBookmark(payload: BookmarkPayload): Promise<void> {
  await api.post('/board/bookmarks', payload);
}

/** 관심 삭제 (없으면 404 가능 → 호출부에서 try/catch 권장) */
export async function removeBookmark(payload: BookmarkPayload): Promise<void> {
  await api.delete('/board/bookmarks', { data: payload });
}
