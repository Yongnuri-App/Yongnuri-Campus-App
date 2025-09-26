// -----------------------------------------------------------
// 채팅방 요약 저장/로드 모듈 (AsyncStorage 기반)
// (변경점)
// - updateRoomOnSendSmart(args)에 nickname?: string 추가
//   → 헤더 계산이 늦게 완료됐을 때 리스트 닉네임까지 동기화 가능
// - 나머지 로직/주석은 동일
// -----------------------------------------------------------

import type {
  ChatCategory,
  ChatRoomOrigin,
  ChatRoomSummary,
} from '@/types/chat';
import { loadJson, saveJson } from '@/utils/storage';

const CHAT_ROOMS_KEY = 'chat_rooms_v1';
const THREAD_INDEX_KEY = 'chat_thread_index_v1';

function clipPreview(s: string, max = 80): string {
  const raw = (s ?? '').toString().trim();
  if (!raw) return '';
  return raw.length > max ? raw.slice(0, max) + '…' : raw;
}
function sortByLatest(rooms: ChatRoomSummary[]) {
  rooms.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
}
export async function loadChatRooms(): Promise<ChatRoomSummary[]> {
  const arr = await loadJson<ChatRoomSummary[]>(CHAT_ROOMS_KEY, []);
  sortByLatest(arr);
  return arr;
}
async function persist(rooms: ChatRoomSummary[]) {
  sortByLatest(rooms);
  await saveJson(CHAT_ROOMS_KEY, rooms);
}
async function loadThreadIndex(): Promise<Record<string, string>> {
  return loadJson<Record<string, string>>(THREAD_INDEX_KEY, {});
}
async function saveThreadIndex(index: Record<string, string>) {
  await saveJson(THREAD_INDEX_KEY, index);
}
function norm(x: unknown): string {
  return (x ?? '').toString().trim().toLowerCase();
}
function canonSource(x: unknown): string {
  const v = norm(x);
  if (!v) return '';
  if (v === 'groupbuy' || v === 'group_buy' || v === 'group-buy' || v === 'group_buying') {
    return 'group';
  }
  return v;
}
function sanitizeOriginParams(p: any) {
  if (!p || typeof p !== 'object') return p;
  const { initialMessage, autoSendInitial, ...rest } = p;
  return rest;
}
function makeThreadKey(originParams: any): string | null {
  if (!originParams) return null;
  const source = canonSource(originParams.source ?? originParams.category);
  const postId = (originParams.postId ?? originParams.productId ?? originParams.boardId ?? '').toString();
  if (!source || !postId) return null;

  const p1 = norm(
    originParams.sellerEmail ??
      originParams.authorEmail ??
      originParams.sellerId ??
      originParams.authorId
  );
  const p2 = norm(
    originParams.buyerEmail ??
      originParams.opponentEmail ??
      originParams.userEmail ??
      originParams.userId ??
      originParams.opponentId
  );
  const participants = [p1, p2].filter(Boolean).sort().join('#');
  return `${source}::${postId}::${participants}`;
}
export async function findExistingRoomIdByContext(originParams: any): Promise<string | null> {
  const key = makeThreadKey(originParams);
  if (!key) return null;

  const index = await loadThreadIndex();
  if (index[key]) return index[key];

  const rooms = await loadChatRooms();
  for (const r of rooms) {
    const k = makeThreadKey(r.origin?.params);
    if (k && k === key) return r.roomId;
  }
  return null;
}
export async function resolveRoomIdForOpen(originParams: any, proposedRoomId: string): Promise<string> {
  const existed = await findExistingRoomIdByContext(originParams);
  return existed ?? proposedRoomId;
}
export async function upsertRoomOnOpen(params: {
  roomId: string;
  category: ChatCategory;
  nickname: string;
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
  preview?: string;
  origin?: ChatRoomOrigin;
}) {
  const rooms = await loadChatRooms();
  const now = Date.now();

  const tKey = makeThreadKey(params.origin?.params);
  let idx = rooms.findIndex(r => r.roomId === params.roomId);

  if (tKey) {
    const sameThreadIdx = rooms.findIndex(r => makeThreadKey(r.origin?.params) === tKey);
    if (sameThreadIdx !== -1) idx = sameThreadIdx;
  }

  const sanitizedOrigin: ChatRoomOrigin | undefined = params.origin
    ? { ...params.origin, params: sanitizeOriginParams(params.origin.params) }
    : undefined;

  if (idx === -1) {
    const base: ChatRoomSummary = {
      roomId: params.roomId,
      category: params.category,
      nickname: params.nickname, // ✅ 항상 상대 닉네임 저장
      lastMessage: clipPreview(params.preview ?? '대화를 시작해보세요'),
      lastTs: now,
      unreadCount: 0,
      productTitle: params.productTitle,
      productPrice: params.productPrice,
      productImageUri: params.productImageUri,
      origin: sanitizedOrigin,
    };
    rooms.unshift(base);

    if (tKey) {
      const index = await loadThreadIndex();
      index[tKey] = params.roomId;
      await saveThreadIndex(index);
    }
  } else {
    const prev = rooms[idx];
    const next: ChatRoomSummary = {
      ...prev,
      category: params.category,
      nickname: params.nickname ?? prev.nickname,
      productTitle: params.productTitle ?? prev.productTitle,
      productPrice: params.productPrice ?? prev.productPrice,
      productImageUri: params.productImageUri ?? prev.productImageUri,
      origin: sanitizedOrigin ?? prev.origin,
    };

    if (params.preview && params.preview.trim().length > 0) {
      next.lastMessage = clipPreview(params.preview);
      next.lastTs = now;
    }

    rooms[idx] = next;

    if (tKey) {
      const index = await loadThreadIndex();
      index[tKey] = rooms[idx].roomId;
      await saveThreadIndex(index);
    }
  }

  await persist(rooms);
}
async function updateRoomPreviewImpl(roomId: string, preview: string, lastTs?: number) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return;

  rooms[idx] = {
    ...rooms[idx],
    lastMessage: clipPreview(preview),
    lastTs: Number.isFinite(lastTs as number) ? (lastTs as number) : Date.now(),
  };
  await persist(rooms);
}
export async function updateRoomOnSend(roomId: string, preview: string, lastTs?: number) {
  await updateRoomPreviewImpl(roomId, preview, lastTs);
}

/**
 * ✅ 스마트 업데이트(+닉네임 동기화):
 * - roomId로 못 찾으면 origin.params로 탐색
 * - args.nickname 이 있으면 리스트에 표시되는 상대 닉네임도 동기화
 */
export async function updateRoomOnSendSmart(args: {
  roomId?: string | null;
  originParams?: any;
  preview?: string;     // 선택: 프리뷰만 갱신하고자 할 때
  lastTs?: number;
  nickname?: string;    // ✅ 선택: 계산된 상대 닉네임 동기화
}) {
  const ts = Number.isFinite(args.lastTs as number) ? (args.lastTs as number) : Date.now();
  const preview = args.preview ? clipPreview(args.preview) : undefined;

  // 내부 공통 갱신자
  const apply = async (rid: string) => {
    const rooms = await loadChatRooms();
    const idx = rooms.findIndex(r => r.roomId === rid);
    if (idx === -1) return;

    const next: ChatRoomSummary = { ...rooms[idx] };
    if (preview != null) {
      next.lastMessage = preview;
      next.lastTs = ts;
    }
    if (args.nickname && args.nickname.trim().length > 0) {
      next.nickname = args.nickname; // ✅ 닉네임 동기화
    }
    rooms[idx] = next;
    await persist(rooms);
  };

  // 1) roomId로 먼저
  if (args.roomId) {
    const rooms = await loadChatRooms();
    const idx = rooms.findIndex(r => r.roomId === args.roomId);
    if (idx !== -1) {
      await apply(args.roomId!);
      return;
    }
  }

  // 2) 맥락으로 찾기
  if (args.originParams) {
    const canonicalId = await findExistingRoomIdByContext(args.originParams);
    if (canonicalId) await apply(canonicalId);
  }
}

export const updateRoomPreview = updateRoomOnSend;

export async function markRoomRead(roomId: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return;
  rooms[idx].unreadCount = 0;
  await persist(rooms);
}
