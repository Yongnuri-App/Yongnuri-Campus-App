// storage/chatStore.ts

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

function getThreadKeyFromRoom(room?: ChatRoomSummary): string | null {
  if (!room) return null;
  return makeThreadKey(room.origin?.params) ?? null;
}

/**
 * ✅ 채팅방 삭제(내 목록에서만 제거)
 * - chat_rooms_v1 배열에서 해당 roomId 항목 제거
 * - chat_thread_index_v1에서 이 roomId를 가리키는 쓰레드 키도 제거
 *   (그래야 이후 같은 컨텍스트로 열 때 '새 방'이 만들어짐)
 */
export async function deleteChatRoom(roomId: string): Promise<void> {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) return;

  // 삭제 대상 방 정보 보관(쓰레드 키 제거용)
  const target = rooms[idx];

  // 1) 방 목록에서 제거
  rooms.splice(idx, 1);
  await persist(rooms);

  // 2) 쓰레드 인덱스에서 roomId 매핑 제거
  const index = await loadThreadIndex();
  // (a) roomId로 역참조 제거
  for (const [k, v] of Object.entries(index)) {
    if (v === roomId) delete index[k];
  }
  // (b) 안전 차원: 해당 방의 쓰레드키가 남아있다면 그것도 제거
  const tKey = getThreadKeyFromRoom(target);
  if (tKey && index[tKey]) delete index[tKey];

  await saveThreadIndex(index);
}

/**
 * ✅ 여러 개 방 한 번에 삭제(선택사항)
 */
export async function deleteChatRooms(roomIds: string[]): Promise<void> {
  if (!Array.isArray(roomIds) || roomIds.length === 0) return;
  const rooms = await loadChatRooms();
  const roomIdSet = new Set(roomIds);

  // 미리 대상 방들의 쓰레드 키 수집
  const targets = rooms.filter((r) => roomIdSet.has(r.roomId));
  const targetKeys = new Set(
    targets
      .map((r) => getThreadKeyFromRoom(r))
      .filter((k): k is string => !!k)
  );

  // 1) 목록에서 필터링 삭제
  const next = rooms.filter((r) => !roomIdSet.has(r.roomId));
  await persist(next);

  // 2) 쓰레드 인덱스 정리
  const index = await loadThreadIndex();
  for (const [k, v] of Object.entries(index)) {
    if (roomIdSet.has(v) || targetKeys.has(k)) {
      delete index[k];
    }
  }
  await saveThreadIndex(index);
}

/**
 * ✅ 맥락(originParams) 기반 삭제(선택사항)
 * - roomId를 모르는 상황에서, 동일 쓰레드 컨텍스트로 열린 방을 찾아 삭제
 */
export async function deleteByContext(originParams: any): Promise<void> {
  const canonicalId = await findExistingRoomIdByContext(originParams);
  if (canonicalId) {
    await deleteChatRoom(canonicalId);
  }
}