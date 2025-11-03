// src/api/blocks.ts
import { api } from './client';

/** 서버 차단 요청 바디 (명세 호환) */
export type BlockUserReq = {
  blockedUserId?: number | string; // 우선 키
  blockedId?: number | string;     // 호환 키
};

export type BlockUserRes = {
  blockedUserId?: number | string;
  blocked?: boolean;
  success?: boolean;
};

/** ✅ 차단: POST /chat/blocks */
export async function postBlockUser(req: BlockUserReq): Promise<BlockUserRes> {
  let id: number | string | undefined = req.blockedUserId ?? req.blockedId;
  if (id == null || id === '') throw new Error('blocked user id is required');

  if (typeof id === 'string') {
    const t = id.trim();
    const n = Number(t);
    id = !Number.isNaN(n) && t !== '' ? n : t;
  }

  const payload = { blockedUserId: id, blockedId: id, blocked: true };
  const res = await api.post('/chat/blocks', payload);
  return res.data as BlockUserRes;
}

/** 서버 차단 목록(마이페이지): GET /mypage/blocks
 *  응답 예: [{ id, blockedId, blockedNickName }]
 */
export type BlockedRow = {
  id: number | string;       // ✅ 레코드 ID (DELETE 경로)
  userId: number | string;   // 상대 사용자 ID (=blockedId)
  nickName: string;          // 닉네임 (=blockedNickName)
};

export async function getBlockedList(): Promise<BlockedRow[]> {
  const res = await api.get('/mypage/blocks');
  const arr = Array.isArray(res.data) ? res.data : [];
  return arr.map((r: any) => ({
    id: r?.id,
    userId: r?.blockedId ?? r?.userId,
    nickName: r?.blockedNickName ?? r?.nickName ?? '알 수 없음',
  })) as BlockedRow[];
}

/** ✅ 해제(레코드 기준): DELETE /chat/blocks/{id} */
export async function deleteBlockById(blockId: number | string): Promise<void> {
  let id: number | string = blockId;
  if (typeof id === 'string') {
    const t = id.trim();
    const n = Number(t);
    id = !Number.isNaN(n) && t !== '' ? n : t;
  }
  try {
    await api.delete(`/chat/blocks/${id}`);
  } catch (e: any) {
    if (e?.response?.status === 404) return; // 이미 해제로 간주
    throw e;
  }
}

/** ✅ (레거시) 상대 사용자ID로 해제 시도 — 서버가 지원할 때만 성공 */
export async function deleteBlockUser(blockedUserId: number | string): Promise<void> {
  let id: number | string = blockedUserId;
  if (typeof id === 'string') {
    const t = id.trim();
    const n = Number(t);
    id = !Number.isNaN(n) && t !== '' ? n : t;
  }
  try {
    await api.delete(`/chat/blocks/${id}`);
  } catch (e: any) {
    if (e?.response?.status === 404) return;
    throw e;
  }
}
