// src/storage/chatStore.ts
// -------------------------------------------------------------
// 채팅방 목록/미리보기/쓰레드 인덱스/읽음/삭제 컷오프 관리 (AsyncStorage 기반)
// ★ 모든 키를 "계정별" 네임스페이스로 분리 ★
// -------------------------------------------------------------

import type { ChatCategory, ChatMessage, ChatRoomOrigin, ChatRoomSummary } from '@/types/chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalIdentity } from '@/utils/localIdentity';

function norm(x: unknown): string { return (x ?? '').toString().trim().toLowerCase(); }
function normIdentity(x?: string | number | null): string { return x == null ? '' : String(x).trim().toLowerCase(); }
function canonSource(x: unknown): string {
  const v = norm(x);
  if (!v) return '';
  if (v === 'groupbuy' || v === 'group_buy' || v === 'group-buy' || v === 'group_buying') return 'group';
  return v;
}
function sanitizeOriginParams(p: any) {
  if (!p || typeof p !== 'object') return p;
  const { initialMessage, autoSendInitial, ...rest } = p;
  return rest;
}

async function myIdentity(): Promise<string> {
  const { userEmail, userId } = await getLocalIdentity();
  return (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : 'anon';
}

/** 계정별 키 */
async function ROOMS_KEY()        { return `${await myIdentity()}::chat_rooms_v1`; }
async function THREAD_INDEX_KEY() { return `${await myIdentity()}::chat_thread_index_v1`; }
async function READ_STATE_KEY()   { return `${await myIdentity()}::chat_read_state_v1`; }
async function DELETE_CUTOFF_KEY(){ return `${await myIdentity()}::chat_delete_cutoff_v1`; }
async function MSG_KEY(roomId: string) { return `${await myIdentity()}::chat_messages_${roomId}`; }

function clipPreview(s: string, max = 80): string {
  const raw = (s ?? '').toString().trim();
  return raw.length > max ? raw.slice(0, max) + '…' : raw;
}
function sortByLatest(rooms: ChatRoomSummary[]) { rooms.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0)); }

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
async function saveJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** 동일 스레드 키 */
function makeThreadKey(originParams: any): string | null {
  if (!originParams) return null;
  const source = canonSource(originParams.source ?? originParams.category);
  const postId = (originParams.postId ?? originParams.productId ?? originParams.boardId ?? '').toString();
  if (!source || !postId) return null;

  const p1 = norm(originParams.sellerEmail ?? originParams.authorEmail ?? originParams.sellerId ?? originParams.authorId);
  const p2 = norm(originParams.buyerEmail ?? originParams.opponentEmail ?? originParams.userEmail ?? originParams.userId ?? originParams.opponentId);
  const participants = [p1, p2].filter(Boolean).sort().join('#');
  return `${source}::${postId}::${participants}`;
}

// ---------------- 로드/저장 ----------------
export async function loadChatRooms(): Promise<ChatRoomSummary[]> {
  const key = await ROOMS_KEY();
  const arr = await loadJson<ChatRoomSummary[]>(key, []);
  sortByLatest(arr);
  return arr;
}
async function persist(rooms: ChatRoomSummary[]) {
  sortByLatest(rooms);
  const key = await ROOMS_KEY();
  await saveJson(key, rooms);
}
async function loadThreadIndex(): Promise<Record<string, string>> {
  const key = await THREAD_INDEX_KEY();
  return loadJson<Record<string, string>>(key, {});
}
async function saveThreadIndex(index: Record<string, string>) {
  const key = await THREAD_INDEX_KEY();
  await saveJson(key, index);
}

// ---------------- 읽음 ----------------
type ReadStateMap = Record<string, Record<string, number>>; // roomId -> (identity -> ts)
async function loadReadState(): Promise<ReadStateMap> {
  const key = await READ_STATE_KEY();
  return loadJson<ReadStateMap>(key, {});
}
async function saveReadState(state: ReadStateMap) {
  const key = await READ_STATE_KEY();
  await saveJson(key, state);
}

// ---------------- 삭제 컷오프 ----------------
type DeleteCutoffMap = Record<string, number>;
async function loadDeleteCutoff(): Promise<DeleteCutoffMap> {
  const key = await DELETE_CUTOFF_KEY();
  return loadJson<DeleteCutoffMap>(key, {});
}
async function saveDeleteCutoff(map: DeleteCutoffMap) {
  const key = await DELETE_CUTOFF_KEY();
  await saveJson(key, map);
}

// ---------------- 탐색/정규화 ----------------
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

// ---------------- 업서트 ----------------
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
  let idx = rooms.findIndex((r) => r.roomId === params.roomId);

  if (tKey) {
    const sameThreadIdx = rooms.findIndex((r) => makeThreadKey(r.origin?.params) === tKey);
    if (sameThreadIdx !== -1) idx = sameThreadIdx;
  }

  const sanitizedOrigin: ChatRoomOrigin | undefined = params.origin
    ? { ...params.origin, params: sanitizeOriginParams(params.origin.params) }
    : undefined;

  if (idx === -1) {
    const base: ChatRoomSummary = {
      roomId: params.roomId,
      category: params.category,
      nickname: params.nickname,
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

// ---------------- 프리뷰/읽음 갱신 ----------------
async function updateRoomPreviewImpl(roomId: string, preview: string, lastTs?: number) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) return;
  rooms[idx] = {
    ...rooms[idx],
    lastMessage: clipPreview(preview),
    lastTs: Number.isFinite(lastTs as number) ? (lastTs as number) : Date.now(),
  };
  await persist(rooms);
}

export async function updateRoomOnSend(roomId: string | number, preview: string, lastTs?: number) {
  await updateRoomPreviewImpl(String(roomId), preview, lastTs);
}
export const updateRoomPreview = updateRoomOnSend;

export async function updateRoomOnSendSmart(args: {
  roomId?: string | null;
  originParams?: any;
  preview?: string;
  lastTs?: number;
  nickname?: string;
}) {
  const ts = Number.isFinite(args.lastTs as number) ? (args.lastTs as number) : Date.now();
  const preview = args.preview ? clipPreview(args.preview) : undefined;

  const apply = async (rid: string) => {
    const rooms = await loadChatRooms();
    const idx = rooms.findIndex((r) => r.roomId === rid);
    if (idx === -1) return;
    const next: ChatRoomSummary = { ...rooms[idx] };
    if (preview != null) {
      next.lastMessage = preview;
      next.lastTs = ts;
    }
    if (args.nickname && args.nickname.trim().length > 0) next.nickname = args.nickname;
    rooms[idx] = next;
    await persist(rooms);
  };

  if (args.roomId) {
    const rooms = await loadChatRooms();
    const idx = rooms.findIndex((r) => r.roomId === args.roomId);
    if (idx !== -1) { await apply(String(args.roomId)); return; }
  }
  if (args.originParams) {
    const canonicalId = await findExistingRoomIdByContext(args.originParams);
    if (canonicalId) await apply(canonicalId);
  }
}

// ---------------- 메시지 로드/UNREAD ----------------
async function loadRoomMessages(roomId: string): Promise<ChatMessage[]> {
  const key = await MSG_KEY(roomId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw) as ChatMessage[]; } catch { return []; }
}

export async function computeUnreadCount(roomId: string, myIdentityStr: string): Promise<number> {
  const messages = await loadRoomMessages(roomId);
  const key = await READ_STATE_KEY();
  const state = await loadJson<Record<string, Record<string, number>>>(key, {});
  const lastSeen = state[roomId]?.[myIdentityStr] ?? 0;

  let cnt = 0;
  for (const m of messages) {
    const ts = m?.time ? new Date(m.time).getTime() : 0;
    if (!ts || ts <= lastSeen) continue;
    const senderEmail = normIdentity((m as any).senderEmail ?? null);
    const senderId    = normIdentity((m as any).senderId ?? null);
    const isMine = senderEmail === myIdentityStr || senderId === myIdentityStr;
    if (!isMine && (m as any).type !== 'system') cnt++;
  }
  return cnt;
}

export async function refreshUnreadForRoom(roomId: string, myIdentityStr: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) return;
  const unread = await computeUnreadCount(roomId, myIdentityStr);
  rooms[idx] = { ...rooms[idx], unreadCount: unread };
  await persist(rooms);
}

export async function refreshAllUnread(myIdentityStr: string) {
  const rooms = await loadChatRooms();
  for (let i = 0; i < rooms.length; i++) {
    const unread = await computeUnreadCount(rooms[i].roomId, myIdentityStr);
    rooms[i] = { ...rooms[i], unreadCount: unread };
  }
  await persist(rooms);
}

/** 로컬 읽음 마킹(타임스탬프 기반) — 서버 API와는 별개 */
export async function markRoomRead(roomId: string, myIdentityRaw: string, seenAt?: number) {
  const myId = normIdentity(myIdentityRaw);
  if (!myId) return;
  const key = await READ_STATE_KEY();
  const state = await loadJson<Record<string, Record<string, number>>>(key, {});
  const now = Number.isFinite(seenAt as number) ? (seenAt as number) : Date.now();
  state[roomId] = state[roomId] ?? {};
  state[roomId][myId] = Math.max(state[roomId][myId] ?? 0, now);
  await saveReadState(state);

  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx !== -1) {
    rooms[idx] = { ...rooms[idx], unreadCount: 0 };
    await persist(rooms);
  }
}

/** ✅ 서버 unreadCount를 목록 배지에 반영 (API 응답 싱크용) */
export async function applyServerUnreadCount(roomId: string | number, count: number) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === String(roomId));
  if (idx === -1) return;
  rooms[idx] = { ...rooms[idx], unreadCount: Math.max(0, count | 0) };
  await persist(rooms);
}

// ---------------- 삭제(내 목록만) ----------------
function getThreadKeyFromRoom(room?: ChatRoomSummary): string | null {
  if (!room) return null;
  return makeThreadKey(room.origin?.params) ?? null;
}
async function recordDeleteCutoff(keys: (string | null | undefined)[]) {
  const map = await loadDeleteCutoff();
  const now = Date.now();
  for (const k of keys) {
    const key = (k ?? '').toString().trim();
    if (!key) continue;
    map[key] = now;
  }
  await saveDeleteCutoff(map);
}

export async function getDeletionCutoff(args: { originParams?: any; roomId?: string | null; }): Promise<number> {
  const map = await loadDeleteCutoff();
  const keys: string[] = [];
  if (args.roomId) keys.push(args.roomId);
  const tKey = makeThreadKey(args.originParams ?? null);
  if (tKey) keys.push(tKey);

  let maxTs = 0;
  for (const k of keys) {
    const ts = map[k];
    if (typeof ts === 'number' && ts > maxTs) maxTs = ts;
  }
  return maxTs;
}

export async function deleteChatRoom(roomId: string): Promise<void> {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) {
    // 방 목록엔 없더라도 로컬 흔적 정리 & 컷오프는 남김
    try { await AsyncStorage.removeItem(await MSG_KEY(roomId)); } catch {}
    const rsKey = await READ_STATE_KEY();
    const rs = await loadJson<Record<string, Record<string, number>>>(rsKey, {});
    if (rs[roomId]) { delete rs[roomId]; await saveJson(rsKey, rs); }
    await recordDeleteCutoff([roomId]);
    return;
  }

  const target = rooms[idx];

  rooms.splice(idx, 1);
  await persist(rooms);

  const index = await loadThreadIndex();
  for (const [k, v] of Object.entries(index)) {
    if (v === roomId) delete index[k];
  }
  const tKey = getThreadKeyFromRoom(target);
  if (tKey && index[tKey]) delete index[tKey];
  await saveThreadIndex(index);

  try { await AsyncStorage.removeItem(await MSG_KEY(roomId)); } catch {}
  const rsKey = await READ_STATE_KEY();
  const state = await loadJson<Record<string, Record<string, number>>>(rsKey, {});
  if (state[roomId]) { delete state[roomId]; await saveJson(rsKey, state); }

  await recordDeleteCutoff([roomId, tKey]);
}

export async function deleteChatRooms(roomIds: string[]): Promise<void> {
  if (!Array.isArray(roomIds) || roomIds.length === 0) return;
  const rooms = await loadChatRooms();
  const roomIdSet = new Set(roomIds);

  const targets = rooms.filter((r) => roomIdSet.has(r.roomId));
  const targetKeys = new Set(
    targets.map((r) => getThreadKeyFromRoom(r)).filter((k): k is string => !!k)
  );

  const next = rooms.filter((r) => !roomIdSet.has(r.roomId));
  await persist(next);

  const index = await loadThreadIndex();
  for (const [k, v] of Object.entries(index)) {
    if (roomIdSet.has(v) || targetKeys.has(k)) delete index[k];
  }
  await saveThreadIndex(index);

  for (const rid of roomIds) { try { await AsyncStorage.removeItem(await MSG_KEY(rid)); } catch {} }
  const rsKey = await READ_STATE_KEY();
  const state = await loadJson<Record<string, Record<string, number>>>(rsKey, {});
  let touched = false;
  for (const rid of roomIds) {
    if (state[rid]) { delete state[rid]; touched = true; }
  }
  if (touched) await saveJson(rsKey, state);

  await recordDeleteCutoff([...roomIds, ...Array.from(targetKeys)]);
}

export async function deleteByContext(originParams: any): Promise<void> {
  const canonicalId = await findExistingRoomIdByContext(originParams);
  if (canonicalId) {
    await deleteChatRoom(canonicalId);
  } else {
    await recordDeleteCutoff([makeThreadKey(originParams)]);
  }
}

const chatStore = {
  loadChatRooms,
  findExistingRoomIdByContext,
  resolveRoomIdForOpen,
  upsertRoomOnOpen,
  updateRoomOnSend,
  updateRoomOnSendSmart,
  updateRoomPreview,
  markRoomRead,               // 로컬 읽음
  refreshUnreadForRoom,
  refreshAllUnread,
  applyServerUnreadCount,     // ✅ 서버 응답 반영
  deleteChatRoom,
  deleteChatRooms,
  deleteByContext,
  getDeletionCutoff,
};
export default chatStore;
