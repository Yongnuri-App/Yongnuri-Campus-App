// /src/utils/chatId.ts
// 원본 네비게이션 파라미터(Detail → ChatRoom)로부터 roomId/카테고리를 복구하는 헬퍼
// - 우리가 DetailBottomBar에서 만들던 규칙과 동일해야 합니다.

export function deriveRoomIdFromParams(params: any): string | null {
  if (!params || !params.source) return null;

  if (params.source === 'market') {
    const { postId, sellerNickname } = params;
    if (!postId || !sellerNickname) return null;
    return `market-${postId}-${sellerNickname}`;
  }
  if (params.source === 'lost') {
    const { postId, posterNickname } = params;
    if (!postId || !posterNickname) return null;
    return `lost-${postId}-${posterNickname}`;
  }
  if (params.source === 'groupbuy') {
    const { postId, authorNickname } = params;
    if (!postId || !authorNickname) return null;
    return `group-${postId}-${authorNickname}`;
  }
  return null;
}

export function mapCategoryFromSource(source: 'market'|'lost'|'groupbuy'): 'market'|'lost'|'group' {
  return source === 'groupbuy' ? 'group' : (source as any);
}
