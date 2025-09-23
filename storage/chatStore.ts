// /src/storage/chatStore.ts
// -----------------------------------------------------------
// 채팅방 요약 저장/로드 모듈 (AsyncStorage 기반)
// - ChatListPage 가 이 저장소를 읽어 방 목록을 그림
// - 상세 → 채팅 진입 시 upsertRoomOnOpen() 으로 방을 생성/갱신
// - 전송/수신 직후 updateRoomOnSend() 로 최근 메시지/시간을 갱신
// -----------------------------------------------------------

import type {
  ChatCategory,
  ChatRoomOrigin,
  ChatRoomSummary,
} from '@/types/chat';
import { loadJson, saveJson } from '@/utils/storage';

const CHAT_ROOMS_KEY = 'chat_rooms_v1';

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

/**
 * 상세 → 채팅 진입 시 방 생성/갱신
 * - preview: 리스트에 바로 보일 최근 메시지(선택; 있으면 lastMessage/lastTs 갱신)
 * - origin : 최초 상세에서 ChatRoom으로 넘겼던 "원본 네비 파라미터" 보관(선택)
 */
export async function upsertRoomOnOpen(params: {
  roomId: string;
  category: ChatCategory;      // 'market' | 'lost' | 'group'
  nickname: string;            // 상대 닉네임
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
  preview?: string;            // 리스트 미리보기(선택)
  origin?: ChatRoomOrigin;     // ✅ 원본 네비 파라미터 보관(선택)
}) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === params.roomId);
  const now = Date.now();

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
      origin: params.origin, // ✅ 최초 진입 시 원본 파라미터 저장
    };
    rooms.unshift(base);
  } else {
    // 기존 방 갱신: 메타는 최신화
    const prev = rooms[idx];
    const next: ChatRoomSummary = {
      ...prev,
      category: params.category,
      nickname: params.nickname ?? prev.nickname,
      productTitle: params.productTitle ?? prev.productTitle,
      productPrice: params.productPrice ?? prev.productPrice,
      productImageUri: params.productImageUri ?? prev.productImageUri,
      origin: params.origin ?? prev.origin, // ✅ 기존 보관값 유지, 새 값이 오면 교체
    };

    // preview 가 들어온 경우에만 최근 메시지/시간 갱신
    if (params.preview && params.preview.trim().length > 0) {
      next.lastMessage = clipPreview(params.preview);
      next.lastTs = now;
    }

    rooms[idx] = next;
  }

  await persist(rooms);
}

/** 내부 공통: 최근 메시지/시간 갱신 구현 (프리뷰 클리핑 + 정렬) */
async function updateRoomPreviewImpl(roomId: string, preview: string, lastTs?: number) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return; // 방 요약이 아직 없으면 무시(상세→채팅에서 upsert로 생성하는 것이 정상 흐름)

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
