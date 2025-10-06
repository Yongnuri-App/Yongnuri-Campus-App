// api/board.ts
import { api } from './client';

// 서버에서 사용하는 열거 문자열 그대로 사용
export type PostType = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY' | 'NOTICE';

/**
 * 게시글 삭제
 * 명세: DELETE /board/delete-post?post_type=LOST_ITEM&post_id=3
 * - 쿼리 파라미터는 snake_case 를 사용해야 함
 * - 혹시 서버가 camelCase 도 허용하는 구현일 수 있어 둘 다 함께 전송(안전장치)
 */
export async function deleteBoardPost(
  postType: PostType,
  postId: string | number
) {
  const pid = Number(postId);

  // ✅ 서버가 snake_case 를 요구. 호환성 위해 camelCase 도 함께 보냄.
  const params = {
    post_type: postType,
    post_id: pid,
    // 호환용 (서버가 camelCase만 읽는 경우 대비)
    postType,
    postId: String(pid),
  };

  console.log('[API REQ] DELETE /board/delete-post', params, '| auth:true');
  const { data } = await api.delete('/board/delete-post', { params });
  console.log('[API RES] DELETE /board/delete-post ->', data);
  return data as { message?: string };
}
