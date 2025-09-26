// -----------------------------------------------------------
// 채팅방 요약 저장/로드 모듈 (AsyncStorage 기반)
// - ChatListPage 가 이 저장소를 읽어 방 목록을 그림
// - 상세 → 채팅 진입 시 upsertRoomOnOpen() 으로 방을 생성/갱신
// - 전송/수신 직후 updateRoomOnSend() 로 최근 메시지/시간을 갱신
// - ❗ 동일 맥락(카테고리+게시글+참여자)으로 들어오면 기존 roomId 재사용
//   (origin.source가 'groupbuy'여도 'group'과 동일 스레드로 인식)
// - ❗ origin.params 에서는 initialMessage/autoSendInitial 같은 "일회성 파라미터"는 저장하지 않음
// -----------------------------------------------------------

import type {
  ChatCategory,
  ChatRoomOrigin,
  ChatRoomSummary,
} from '@/types/chat';
import { loadJson, saveJson } from '@/utils/storage';

const CHAT_ROOMS_KEY = 'chat_rooms_v1';
const THREAD_INDEX_KEY = 'chat_thread_index_v1'; // 스레드키→roomId 매핑 인덱스

/** 내부: 미리보기 텍스트를 너무 길면 잘라서 한 줄 유지 */
function clipPreview(s: string, max = 80): string {
  const raw = (s ?? '').toString().trim();
  if (!raw) return '';
  return raw.length > max ? raw.slice(0, max) + '…' : raw;
}

/** 내부: 정렬(최신순) 보장 */
function sortByLatest(rooms: ChatRoomSummary[]) {
  rooms.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
}

/** 채팅방 목록 불러오기 (항상 최신순으로 반환) */
export async function loadChatRooms(): Promise<ChatRoomSummary[]> {
  const arr = await loadJson<ChatRoomSummary[]>(CHAT_ROOMS_KEY, []);
  sortByLatest(arr);
  return arr;
}

/** 내부: 저장(정렬 포함) */
async function persist(rooms: ChatRoomSummary[]) {
  sortByLatest(rooms);
  await saveJson(CHAT_ROOMS_KEY, rooms);
}

/** 내부: 스레드 인덱스 로드/저장 */
async function loadThreadIndex(): Promise<Record<string, string>> {
  return loadJson<Record<string, string>>(THREAD_INDEX_KEY, {});
}
async function saveThreadIndex(index: Record<string, string>) {
  await saveJson(THREAD_INDEX_KEY, index);
}

/** 문자열 정규화(공백 제거+소문자) */
function norm(x: unknown): string {
  return (x ?? '').toString().trim().toLowerCase();
}

/** ✅ source 동의어 정규화: 'groupbuy' → 'group' 등 */
function canonSource(x: unknown): string {
  const v = norm(x);
  if (!v) return '';
  if (v === 'groupbuy' || v === 'group_buy' || v === 'group-buy' || v === 'group_buying') {
    return 'group';
  }
  return v;
}

/** ✅ origin.params 저장 전 "일회성 파라미터" 제거 */
function sanitizeOriginParams(p: any) {
  if (!p || typeof p !== 'object') return p;
  const {
    initialMessage,      // ❌ 저장하지 않음 (재입장시 재전송 방지)
    autoSendInitial,     // ❌ 저장하지 않음
    ...rest
  } = p;
  return rest;
}

/**
 * ❗ 동일 대화 맥락을 식별하는 "스레드 키" 생성
 *  - source/category: 'market' | 'lost' | 'group' (origin.source가 'groupbuy'여도 'group'으로 간주)
 *  - 게시글 식별자: postId/productId/boardId
 *  - 참여자: 이메일/ID 중 존재하는 값 2개를 사전순으로 결합(순서 무관)
 */
function makeThreadKey(originParams: any): string | null {
  if (!originParams) return null;

  // ✅ source 우선, 없으면 category 사용 → 그리고 정규화
  const source = canonSource(originParams.source ?? originParams.category);
  const postId = (originParams.postId ?? originParams.productId ?? originParams.boardId ?? '').toString();
  if (!source || !postId) return null;

  // 참여자 후보(존재하는 것만)
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

  const participants = [p1, p2].filter(Boolean).sort().join('#'); // 순서 무관
  return `${source}::${postId}::${participants}`;
}

/** 주어진 네비 파라미터와 동일 맥락의 기존 방이 있으면 roomId 반환 */
export async function findExistingRoomIdByContext(originParams: any): Promise<string | null> {
  const key = makeThreadKey(originParams);
  if (!key) return null;

  // 1) 인덱스에서 먼저 찾기(가장 빠름)
  const index = await loadThreadIndex();
  if (index[key]) return index[key];

  // 2) 방 목록에서 백업 탐색(인덱스 누락 대비)
  const rooms = await loadChatRooms();
  for (const r of rooms) {
    const k = makeThreadKey(r.origin?.params);
    if (k && k === key) {
      return r.roomId;
    }
  }
  return null;
}

/**
 * (선택) 상세 진입 시, 제안된 roomId를 기존 방의 roomId로 바꿔줌
 * - 기존 방이 있으면 그 roomId를 반환, 없으면 제안된 roomId 반환
 */
export async function resolveRoomIdForOpen(originParams: any, proposedRoomId: string): Promise<string> {
  const existed = await findExistingRoomIdByContext(originParams);
  return existed ?? proposedRoomId;
}

/**
 * 상세 → 채팅 진입 시 방 생성/갱신
 * - preview: 리스트에 바로 보일 최근 메시지(선택; 있으면 lastMessage/lastTs 갱신)
 * - origin : 최초 상세에서 ChatRoom으로 넘겼던 "원본 네비 파라미터" 보관(선택)
 * - ❗ 동일 스레드가 이미 있으면 roomId가 달라도 "기존 방"을 갱신(중복 생성 방지)
 * - ❗ origin.params 에서 initialMessage/autoSendInitial 은 저장하지 않음
 */
export async function upsertRoomOnOpen(params: {
  roomId: string;
  category: ChatCategory;      // 'market' | 'lost' | 'group'
  nickname: string;            // 상대 닉네임
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
  preview?: string;            // 리스트 미리보기(선택)
  origin?: ChatRoomOrigin;     // 원본 네비 파라미터 보관(선택)
}) {
  const rooms = await loadChatRooms();
  const now = Date.now();

  // 1) 스레드키 계산 (origin.source가 'groupbuy'여도 내부적으로 'group'으로 처리)
  const tKey = makeThreadKey(params.origin?.params);

  // 2) 우선 roomId로 찾기
  let idx = rooms.findIndex(r => r.roomId === params.roomId);

  // 3) 스레드키로 기존 방 재탐색(중복 생성 방지)
  if (tKey) {
    const sameThreadIdx = rooms.findIndex(r => makeThreadKey(r.origin?.params) === tKey);
    if (sameThreadIdx !== -1) {
      idx = sameThreadIdx; // ✅ roomId 달라도 같은 맥락이면 기존 방 갱신
    }
  }

  // ✅ 저장 전에 origin.params를 sanitize
  const sanitizedOrigin: ChatRoomOrigin | undefined = params.origin
    ? { ...params.origin, params: sanitizeOriginParams(params.origin.params) }
    : undefined;

  if (idx === -1) {
    // 신규 방 생성
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
      origin: sanitizedOrigin, // ✅ 일회성 필드 제거된 원본만 저장
    };
    rooms.unshift(base);

    // 인덱스 갱신
    if (tKey) {
      const index = await loadThreadIndex();
      index[tKey] = params.roomId;
      await saveThreadIndex(index);
    }
  } else {
    // 기존 방 갱신
    const prev = rooms[idx];
    const next: ChatRoomSummary = {
      ...prev,
      category: params.category,
      nickname: params.nickname ?? prev.nickname,
      productTitle: params.productTitle ?? prev.productTitle,
      productPrice: params.productPrice ?? prev.productPrice,
      productImageUri: params.productImageUri ?? prev.productImageUri,
      origin: sanitizedOrigin ?? prev.origin, // ✅ sanitize된 origin 우선 적용
    };

    if (params.preview && params.preview.trim().length > 0) {
      next.lastMessage = clipPreview(params.preview);
      next.lastTs = now;
    }

    rooms[idx] = next;

    // 인덱스 보정(기존 방의 roomId가 최종 canonical)
    if (tKey) {
      const index = await loadThreadIndex();
      index[tKey] = rooms[idx].roomId;
      await saveThreadIndex(index);
    }
  }

  await persist(rooms);
}

/** 내부 공통: 최근 메시지/시간 갱신 구현 (프리뷰 클리핑 + 정렬) */
async function updateRoomPreviewImpl(roomId: string, preview: string, lastTs?: number) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return; // 방 요약이 아직 없으면 무시

  rooms[idx] = {
    ...rooms[idx],
    lastMessage: clipPreview(preview),
    lastTs: Number.isFinite(lastTs as number) ? (lastTs as number) : Date.now(),
  };

  await persist(rooms);
}

/**
 * 메시지 전송/수신 후 리스트의 최근 메시지/시간 갱신
 * - preview: 말풍선에 보여줄 프리뷰(텍스트/사진/시스템 텍스트 등)
 * - lastTs : (선택) 메시지 시간(ms). 없으면 Date.now()
 */
export async function updateRoomOnSend(roomId: string, preview: string, lastTs?: number) {
  await updateRoomPreviewImpl(roomId, preview, lastTs);
}

/**
 * ✅ 스마트 업데이트: roomId로 못 찾으면 "대화 맥락(origin.params)"으로 방을 찾아 갱신
 * - ChatRoomPage가 들고있는 roomId가 제안값(=실제 저장된 roomId와 다름)일 때 대비
 */
export async function updateRoomOnSendSmart(args: {
  roomId?: string | null;
  originParams?: any;
  preview: string;
  lastTs?: number;
}) {
  const ts = Number.isFinite(args.lastTs as number) ? (args.lastTs as number) : Date.now();
  const preview = clipPreview(args.preview);

  // 1) roomId로 먼저 시도
  if (args.roomId) {
    const rooms = await loadChatRooms();
    const idx = rooms.findIndex(r => r.roomId === args.roomId);
    if (idx !== -1) {
      rooms[idx] = { ...rooms[idx], lastMessage: preview, lastTs: ts };
      await persist(rooms);
      return;
    }
  }

  // 2) 맥락으로 roomId 찾기
  if (args.originParams) {
    const canonicalId = await findExistingRoomIdByContext(args.originParams);
    if (canonicalId) {
      await updateRoomPreviewImpl(canonicalId, preview, ts);
    }
  }
}

/** 🔁 별칭: 이름만 다르게 쓰고 싶을 때 사용 가능 (동일 동작) */
export const updateRoomPreview = updateRoomOnSend;

/** 방 진입 시 안읽음 카운트 초기화 */
export async function markRoomRead(roomId: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return;
  rooms[idx].unreadCount = 0;
  await persist(rooms);
}
