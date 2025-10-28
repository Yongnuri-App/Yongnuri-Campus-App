// /src/storage/chatStore.ts
// 채팅방 목록/미리보기/쓰레드 인덱스 관리 (AsyncStorage 기반)

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatCategory, ChatRoomOrigin, ChatRoomSummary } from '@/types/chat';

const CHAT_ROOMS_KEY = 'chat_rooms_v1';
const THREAD_INDEX_KEY = 'chat_thread_index_v1';

// ----------------------------- 공통 유틸 -----------------------------
function clipPreview(s: string, max = 80): string {
  const raw = (s ?? '').toString().trim();
  if (!raw) return '';
  return raw.length > max ? raw.slice(0, max) + '…' : raw;
}

function sortByLatest(rooms: ChatRoomSummary[]) {
  rooms.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
}

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function saveJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function norm(x: unknown): string {
  return (x ?? '').toString().trim().toLowerCase();
}

function canonSource(x: unknown): string {
  const v = norm(x);
  if (!v) return '';
  if (
    v === 'groupbuy' ||
    v === 'group_buy' ||
    v === 'group-buy' ||
    v === 'group_buying'
  ) {
    return 'group';
  }
  return v;
}

function sanitizeOriginParams(p: any) {
  if (!p || typeof p !== 'object') return p;
  // 메시지 시딩 관련 플래그는 저장하지 않음
  const { initialMessage, autoSendInitial, ...rest } = p;
  return rest;
}

// 동일한 “대화 스레드”를 식별하는 키
function makeThreadKey(originParams: any): string | null {
  if (!originParams) return null;
  const source = canonSource(originParams.source ?? originParams.category);
  const postId = (originParams.postId ??
    originParams.productId ??
    originParams.boardId ??
    '').toString();
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

// ----------------------------- 로드/저장 -----------------------------
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

// ----------------------------- 방 탐색/정규화 -----------------------------
export async function findExistingRoomIdByContext(
  originParams: any
): Promise<string | null> {
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

export async function resolveRoomIdForOpen(
  originParams: any,
  proposedRoomId: string
): Promise<string> {
  const existed = await findExistingRoomIdByContext(originParams);
  return existed ?? proposedRoomId;
}

// ----------------------------- 방 생성/업서트 -----------------------------
export async function upsertRoomOnOpen(params: {
  roomId: string;
  category: ChatCategory;
  nickname: string; // 리스트에 표시될 상대 닉네임
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
    const sameThreadIdx = rooms.findIndex(
      (r) => makeThreadKey(r.origin?.params) === tKey
    );
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

// ----------------------------- 프리뷰/읽음 -----------------------------
async function updateRoomPreviewImpl(
  roomId: string,
  preview: string,
  lastTs?: number
) {
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

/** ✅ 심플: roomId로 바로 프리뷰 갱신 */
export async function updateRoomOnSend(
  roomId: string | number,
  preview: string,
  lastTs?: number
) {
  await updateRoomPreviewImpl(String(roomId), preview, lastTs);
}

export const updateRoomPreview = updateRoomOnSend;

/**
 * ✅ 스마트 업데이트(+닉네임 동기화):
 * - roomId로 못 찾으면 origin.params(쓰레드키)로 탐색
 * - args.nickname 이 있으면 리스트 닉네임도 동기화
 */
export async function updateRoomOnSendSmart(args: {
  roomId?: string | null;
  originParams?: any;
  preview?: string; // 선택: 프리뷰만 갱신하고자 할 때
  lastTs?: number;
  nickname?: string; // 선택: 계산된 상대 닉네임 동기화
}) {
  const ts = Number.isFinite(args.lastTs as number)
    ? (args.lastTs as number)
    : Date.now();
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
    if (args.nickname && args.nickname.trim().length > 0) {
      next.nickname = args.nickname;
    }
    rooms[idx] = next;
    await persist(rooms);
  };

  // 1) roomId로 먼저
  if (args.roomId) {
    const rooms = await loadChatRooms();
    const idx = rooms.findIndex((r) => r.roomId === args.roomId);
    if (idx !== -1) {
      await apply(String(args.roomId));
      return;
    }
  }

  // 2) 맥락으로 찾기
  if (args.originParams) {
    const canonicalId = await findExistingRoomIdByContext(args.originParams);
    if (canonicalId) await apply(canonicalId);
  }
}

export async function markRoomRead(roomId: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) return;
  rooms[idx].unreadCount = 0;
  await persist(rooms);
}

// ----------------------------- 삭제 -----------------------------
function getThreadKeyFromRoom(room?: ChatRoomSummary): string | null {
  if (!room) return null;
  return makeThreadKey(room.origin?.params) ?? null;
}

/** ✅ 단일 방 삭제(내 목록에서만 제거 + 쓰레드 인덱스 정리) */
export async function deleteChatRoom(roomId: string): Promise<void> {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) return;

  const target = rooms[idx];

  rooms.splice(idx, 1);
  await persist(rooms);

  const index = await loadThreadIndex();
  // roomId 역참조 제거
  for (const [k, v] of Object.entries(index)) {
    if (v === roomId) delete index[k];
  }
  // 안전: 해당 방의 쓰레드키도 제거
  const tKey = getThreadKeyFromRoom(target);
  if (tKey && index[tKey]) delete index[tKey];

  await saveThreadIndex(index);
}

/** ✅ 여러 방 한번에 삭제 */
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
}

/** ✅ 맥락(originParams) 기반 삭제 */
export async function deleteByContext(originParams: any): Promise<void> {
  const canonicalId = await findExistingRoomIdByContext(originParams);
  if (canonicalId) {
    await deleteChatRoom(canonicalId);
  }
}

// ----------------------------- 기본 내보내기(양쪽 임포트 호환) -----------------------------
const chatStore = {
  loadChatRooms,
  findExistingRoomIdByContext,
  resolveRoomIdForOpen,
  upsertRoomOnOpen,
  updateRoomOnSend,
  updateRoomOnSendSmart,
  updateRoomPreview,
  markRoomRead,
  deleteChatRoom,
  deleteChatRooms,
  deleteByContext,
};

export default chatStore;
