// api/market.ts
import type { CreateMarketPostReq, MarketStatus } from '../types/market';
import { api } from './client';
import { uploadImages } from './images';
import { toAbsoluteUrl } from './url';

/** 게시글 작성 */
export async function createMarketPost(payload: CreateMarketPostReq) {
  console.log('[createMarketPost] payload', payload);
  const { data } = await api.post('/board/market', payload);
  const norm = {
    post_id: data.post_id ?? data.postId ?? data.id,
    message: data.message,
  };
  console.log('[createMarketPost] response(norm)', norm);
  return norm as { post_id: number | string; message?: string };
}

/** ✅ 로컬/원격 섞인 images를 처리해 서버 URL로만 만들어서 생성 */
export async function createMarketPostSmart(payload: Omit<CreateMarketPostReq, 'imageUrls'> & { imageUris: string[] }) {
  const localUris = payload.imageUris.filter(u => u.startsWith('file://') || u.startsWith('content://'));
  const remoteUris = payload.imageUris.filter(u => !u.startsWith('file://') && !u.startsWith('content://'));
  let uploaded: string[] = [];
  if (localUris.length) {
    uploaded = await uploadImages(localUris);   // 서버가 /uploads/... 반환(상대 or 절대)
  }
  const finalImageUrls = [...remoteUris.map(u => toAbsoluteUrl(u)!), ...uploaded];
  return createMarketPost({
    title: payload.title,
    content: payload.content,
    method: payload.method,
    location: payload.location,
    price: payload.price,
    status: payload.status,
    imageUrls: finalImageUrls,                  // ★ 서버 접근 가능한 URL만 전송
  });
}

/** 게시글 상세 조회 */
export async function getMarketPost(post_id: string | number) {
  console.log('[getMarketPost] 요청:', post_id);
  const { data } = await api.get(`/board/market/${post_id}`);
  console.log('[getMarketPost] 응답:', data);
  return data;
}

/** ✅ 중고거래 목록 조회 (GET /board/market?type=...) */
export async function getMarketList(typeLabel: string = '전체') {
  // 서버 명세: type = '전체' | '무도대' | '체육과학대학' | 'AI바이오융합대학' | '용인대' ...
  console.log('[getMarketList] type =', typeLabel);
  const { data } = await api.get('/board/market', { params: { type: typeLabel } });
  console.log('[getMarketList] response length =', Array.isArray(data) ? data.length : 'N/A');
  return data as any[];
}

/** ✅ 중고거래 게시글 수정 (PATCH /board/market/{post_id}) */
export type UpdateMarketPostReq = {
  title?: string;
  content?: string;
  imageUrls?: string[];
  method?: 'SELL' | 'DONATE';
  location?: string;
  price?: number;
  status?: MarketStatus;
};

export async function updateMarketPost(
  post_id: string | number,
  payload: UpdateMarketPostReq
) {
  console.log('[updateMarketPost] post_id', post_id);
  console.log('[updateMarketPost] payload', payload);
  const { data } = await api.patch(`/board/market/${post_id}`, payload);
  const norm = {
    post_id: data.postId ?? data.post_id ?? post_id,
    message: data.message ?? '게시글 수정 성공',
  };
  console.log('[updateMarketPost] response(norm)', norm);
  return norm as { post_id: number | string; message: string };
}
/** ✅ 게시글 상태 변경 (PATCH /board/market/{postId}/status)
 * - RESERVED/SOLD 전환 시 buyerId 필요
 * - SELLING/DELETED 전환 시 buyerId 생략 가능
 */
export async function patchMarketStatus(
  postId: number | string,
  status: MarketStatus,
  buyerId?: number | null,
  chatRoomId?: number | null
): Promise<{ message: string }> {
  const body: any = { status };
  if (buyerId != null) body.buyerId = buyerId;
  if (chatRoomId != null) body.chatRoomId = chatRoomId; 
  const { data } = await api.patch(`/board/market/${postId}/status`, body);
  // 서버는 현재 문자열 메시지 반환: "게시글 상태가 변경되었습니다."
  return { message: String(data ?? 'OK') };
}
