// /src/storage/chatStore.ts
import type { ChatCategory, ChatRoomSummary } from '@/types/chat';
import { loadJson, saveJson } from '@/utils/storage';

const CHAT_ROOMS_KEY = 'chat_rooms_v1';

/** 채팅방 목록 불러오기 */
export async function loadChatRooms(): Promise<ChatRoomSummary[]> {
  const arr = await loadJson<ChatRoomSummary[]>(CHAT_ROOMS_KEY, []);
  return arr.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
}

/** 채팅방 목록 저장(정렬 보장) */
async function persist(rooms: ChatRoomSummary[]) {
  rooms.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
  await saveJson(CHAT_ROOMS_KEY, rooms);
}

/** 상세 → 채팅 진입 시 방 생성/갱신 (+선택적 미리보기) */
export async function upsertRoomOnOpen(params: {
  roomId: string;
  category: ChatCategory;
  nickname: string;
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
  /** 리스트에 바로 보일 미리보기(선택) */
  preview?: string;
}) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === params.roomId);

  if (idx === -1) {
    const base: ChatRoomSummary = {
      roomId: params.roomId,
      category: params.category,
      nickname: params.nickname,
      lastMessage: params.preview ?? '대화를 시작해보세요',
      lastTs: Date.now(),
      unreadCount: 0,
      productTitle: params.productTitle,
      productPrice: params.productPrice,
      productImageUri: params.productImageUri,
    };
    rooms.unshift(base);
  } else {
    // 메타는 항상 최신화, 미리보기가 있으면 최근 메시지로 반영
    rooms[idx] = {
      ...rooms[idx],
      category: params.category,
      nickname: params.nickname,
      productTitle: params.productTitle ?? rooms[idx].productTitle,
      productPrice: params.productPrice ?? rooms[idx].productPrice,
      productImageUri: params.productImageUri ?? rooms[idx].productImageUri,
      ...(params.preview
        ? { lastMessage: params.preview, lastTs: Date.now() }
        : null),
    };
  }
  await persist(rooms);
}

/** 메시지 전송 후 리스트 업데이트 */
export async function updateRoomOnSend(roomId: string, preview: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return;
  rooms[idx] = {
    ...rooms[idx],
    lastMessage: preview,
    lastTs: Date.now(),
  };
  await persist(rooms);
}

/** 방 진입 시 안읽음 카운트 초기화 */
export async function markRoomRead(roomId: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return;
  rooms[idx].unreadCount = 0;
  await persist(rooms);
}
