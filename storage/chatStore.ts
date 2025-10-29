// /src/storage/chatStore.ts
// 채팅방 목록/미리보기/쓰레드 인덱스 관리 (AsyncStorage 기반)

import type { ChatCategory, ChatMessage, ChatRoomOrigin, ChatRoomSummary } from '@/types/chat';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_ROOMS_KEY = 'chat_rooms_v1';
const THREAD_INDEX_KEY = 'chat_thread_index_v1';

/** ✅ 방별 메시지 저장 키(prefix) — useChatRoom과 동일하게 맞춰야 읽을 수 있음 */
const MESSAGE_PREFIX = 'chat_messages_';

/** ✅ 사용자별 마지막 읽음 시각 저장소
 * 구조: { [roomId]: { [identity]: lastSeenTs(ms) } }
 */
const READ_STATE_KEY = 'chat_read_state_v1';

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

function normIdentity(x?: string | number | null): string {
  if (x == null) return '';
  return String(x).trim().toLowerCase();
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

/** ✅ 읽음 상태 로드/저장 */
type ReadStateMap = Record<string, Record<string, number>>; // roomId -> (identity -> ts)

async function loadReadState(): Promise<ReadStateMap> {
  return loadJson<ReadStateMap>(READ_STATE_KEY, {});
}
async function saveReadState(state: ReadStateMap) {
  await saveJson(READ_STATE_KEY, state);
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

/** ✅ 방의 메시지를 로드 (unread 계산용) */
async function loadRoomMessages(roomId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(MESSAGE_PREFIX + roomId);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

/** ✅ unread 개수 재계산:
 * - 기준: lastSeenTs 이후에 들어온 "상대가 보낸" 메시지 개수
 * - system 메시지는 제외
 */
async function computeUnreadCount(roomId: string, myIdentity: string): Promise<number> {
  const messages = await loadRoomMessages(roomId);
  const readState = await loadReadState();
  const lastSeen = readState[roomId]?.[myIdentity] ?? 0;

  let cnt = 0;
  for (const m of messages) {
    const ts = m?.time ? new Date(m.time).getTime() : 0;
    if (!ts || ts <= lastSeen) continue;

    const senderEmail = normIdentity((m as any).senderEmail ?? null);
    const senderId    = normIdentity((m as any).senderId ?? null);
    const isMine = senderEmail === myIdentity || senderId === myIdentity;

    if (!isMine && (m as any).type !== 'system') cnt++;
  }
  return cnt;
}

/** ✅ 특정 방의 unread를 재계산해서 ChatRoomSummary에 반영 */
export async function refreshUnreadForRoom(roomId: string, myIdentity: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) return;

  const unread = await computeUnreadCount(roomId, myIdentity);
  rooms[idx] = { ...rooms[idx], unreadCount: unread };
  await persist(rooms);
}

/** ✅ 전체 방에 대해 unread를 재계산 (앱 시작/로그인 직후 등에서 유용) */
export async function refreshAllUnread(myIdentity: string) {
  const rooms = await loadChatRooms();
  for (let i = 0; i < rooms.length; i++) {
    const unread = await computeUnreadCount(rooms[i].roomId, myIdentity);
    rooms[i] = { ...rooms[i], unreadCount: unread };
  }
  await persist(rooms);
}

/** ✅ 방 포커스 시 호출: 사용자별 lastSeenTs 저장 + 목록에서 unread=0 반영 */
export async function markRoomRead(roomId: string, myIdentityRaw: string, seenAt?: number) {
  const myIdentity = normIdentity(myIdentityRaw);
  if (!myIdentity) return;

  // 1) ReadState 업데이트
  const state = await loadReadState();
  const now = Number.isFinite(seenAt as number) ? (seenAt as number) : Date.now();
  state[roomId] = state[roomId] ?? {};
  state[roomId][myIdentity] = Math.max(state[roomId][myIdentity] ?? 0, now);
  await saveReadState(state);

  // 2) 목록에서도 즉시 0으로
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx !== -1) {
    rooms[idx] = { ...rooms[idx], unreadCount: 0 };
    await persist(rooms);
  }
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
  /** ✅ 업데이트된 시그니처 */
  markRoomRead,
  /** ✅ 새로 추가 */
  refreshUnreadForRoom,
  refreshAllUnread,
  deleteChatRoom,
  deleteChatRooms,
  deleteByContext,
};

export default chatStore;
