// /src/utils/chatId.ts
// Detail → ChatRoom 네비게이션 파라미터로부터 roomId/카테고리 복구 헬퍼
// - 기존 규칙의 접두부(시장/분실/공구 + postId + 닉네임 슬러그)를 유지하되
//   "상대 식별자(opponentId/email)"가 있으면 뒤에 덧붙여 충돌을 방지한다.
// - 상대 식별자가 없을 때는 기존 규칙으로 폴백한다.

/** 닉네임을 키에 넣을 때 안전하게 변환 */
function slug(n?: string) {
  return (n ?? '')
    .toString()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-가-힣_]/g, '')
    .toLowerCase();
}

/** 상대방을 유일하게 식별할 수 있는 값 우선순위 */
function pickOpponentKey(p: any): string | null {
  const cand =
    p?.opponentId ?? p?.buyerId ?? p?.sellerId ?? p?.authorId ?? p?.userId ??
    p?.opponentEmail ?? p?.buyerEmail ?? p?.sellerEmail ?? p?.authorEmail ?? p?.userEmail ??
    null;
  return cand != null ? String(cand).toLowerCase() : null;
}

export function deriveRoomIdFromParams(params: any): string | null {
  if (!params || !params.source) return null;

  const opponent = pickOpponentKey(params); // 있으면 충돌 방지용으로 사용

  if (params.source === 'market') {
    const { postId, sellerNickname } = params;
    if (!postId || !sellerNickname) return null;
    const base = `market-${postId}-${slug(sellerNickname)}`;
    return opponent ? `${base}::${opponent}` : base;
  }

  if (params.source === 'lost') {
    const { postId, posterNickname } = params;
    if (!postId || !posterNickname) return null;
    const base = `lost-${postId}-${slug(posterNickname)}`;
    return opponent ? `${base}::${opponent}` : base;
  }

  if (params.source === 'groupbuy') {
    const { postId, authorNickname } = params;
    if (!postId || !authorNickname) return null;
    const base = `group-${postId}-${slug(authorNickname)}`;
    return opponent ? `${base}::${opponent}` : base;
  }

  return null;
}

export function mapCategoryFromSource(
  source: 'market' | 'lost' | 'groupbuy'
): 'market' | 'lost' | 'group' {
  return source === 'groupbuy' ? 'group' : (source as any);
}
