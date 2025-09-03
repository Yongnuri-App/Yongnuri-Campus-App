// /src/storage/chatStore.ts
// AsyncStorage 유틸을 통한 채팅방 요약 저장/로드 모듈
// - 리스트 화면(ChatListPage)이 이 저장소를 읽어 방 목록을 그립니다.
// - 상세 → 채팅 진입 시 upsertRoomOnOpen()으로 방을 생성/갱신합니다.
// - 전송 성공 시 updateRoomOnSend()로 최근 메시지/시간을 갱신합니다.

import type {
    ChatCategory,
    ChatRoomOrigin,
    ChatRoomSummary,
} from '@/types/chat';
import { loadJson, saveJson } from '@/utils/storage';

const CHAT_ROOMS_KEY = 'chat_rooms_v1';

/** 채팅방 목록 불러오기 (최근 대화순 정렬) */
export async function loadChatRooms(): Promise<ChatRoomSummary[]> {
  const arr = await loadJson<ChatRoomSummary[]>(CHAT_ROOMS_KEY, []);
  return arr.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
}

/** 채팅방 목록 저장(정렬 보장) */
async function persist(rooms: ChatRoomSummary[]) {
  rooms.sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
  await saveJson(CHAT_ROOMS_KEY, rooms);
}

/**
 * 상세 → 채팅 진입 시 방 생성/갱신
 * - preview: 리스트에 바로 보일 최근 메시지(선택)
 * - origin : 최초 상세에서 ChatRoom으로 넘겼던 "원본 네비 파라미터" 보관(선택)
 *            → ChatList에서 해당 방을 눌렀을 때 동일 파라미터로 재진입 가능
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

  if (idx === -1) {
    // 신규 방 생성
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
      origin: params.origin, // ✅ 최초 진입 시 원본 파라미터 저장
    };
    rooms.unshift(base);
  } else {
    // 기존 방 갱신: 메타는 항상 최신화, preview 있으면 최근 메시지/시간 갱신
    rooms[idx] = {
      ...rooms[idx],
      category: params.category,
      nickname: params.nickname,
      productTitle: params.productTitle ?? rooms[idx].productTitle,
      productPrice: params.productPrice ?? rooms[idx].productPrice,
      productImageUri: params.productImageUri ?? rooms[idx].productImageUri,
      origin: params.origin ?? rooms[idx].origin, // ✅ 기존 보관값 유지, 새 값이 오면 교체
      ...(params.preview
        ? { lastMessage: params.preview, lastTs: Date.now() }
        : null),
    };
  }
  await persist(rooms);
}

/** 메시지 전송 후 리스트의 최근 메시지/시간 갱신 */
export async function updateRoomOnSend(roomId: string, preview: string) {
  const rooms = await loadChatRooms();
  const idx = rooms.findIndex(r => r.roomId === roomId);
  if (idx === -1) return; // 방이 아직 없으면 무시(상세→채팅에서 upsert로 생성하는 것이 정상 흐름)
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
