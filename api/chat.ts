// src/api/chat.ts
import { api } from './client';

/** 서버가 인식하는 채팅 종류 */
export type ChatType = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY' | 'ALL';
/** 목록 조회용 필터 값 (ALL 허용) */
export type ChatListType = ChatType | 'ALL';

export type ChatMessageType = 'text' | 'img';

export type CreateRoomReq = {
  type: Exclude<ChatType, 'ALL'>;
  typeId?: number;     //
  toUserId?: number;  // 상대방 사용자 ID
  message: string;
  messageType: ChatMessageType;
};

export type CreateRoomRes = {
  roomInfo: {
    roomId: number;
    chatType: Exclude<ChatType, 'ALL'>;
    chatTypeId?: number | null;
    opponentId: number;
    opponentNickname: string;
    title: string;
    status?: string | null;
    price?: string | null;
    tradeStatus?: 'SELLING' | 'RESERVED' | 'SOLD';
    peopleCount?: number | null;
    text?: string | null;
    imageUrl?: string | null;
  };
  messages: {
    senderId: number;
    senderNickname: string;
    message: string;
    createdAt: string;
  }[];
};

export async function createOrGetRoom(body: CreateRoomReq): Promise<CreateRoomRes> {
  const res = await api.post('/chat/rooms', body); //
  return res.data as CreateRoomRes;
}

/** 방 상세 조회 (server room id) */
export type GetRoomDetailRes = CreateRoomRes;
export async function getRoomDetail(roomId: number): Promise<GetRoomDetailRes> {
  const res = await api.get(`/chat/rooms/${roomId}`);
  return res.data as GetRoomDetailRes;
}

/** ===== 채팅방 목록 ===== */
export type ChatListItem = {
  id: number;
  type: Exclude<ChatType, 'ALL'>;   // 서버는 목록 아이템에 실제 타입만 내려줌
  lastMessage: string;
  updateTime: string;               // 예: "12시간 전"
  toUserNickName: string;
};

export async function getRooms(type: ChatListType = 'ALL'): Promise<ChatListItem[]> {
  // ✅ 반드시 쿼리로 type 전송
  const res = await api.get('/chat/rooms', { params: { type } });
  return res.data as ChatListItem[];
}

/** ====== 메시지 전송 ====== */
export type SendMessageReq = {
  roomId: number;        // 서버 채팅방 ID
  sender: number;        // 내 사용자 ID
  message: string;       // 보낼 텍스트
  type: 'text' | 'img';
};

export type SendMessageRes = {
  roomId: number;
  sender: number;
  message: string;
  type: 'text' | 'img';
  createdAt?: string;
};

export async function sendMessage(req: SendMessageReq): Promise<SendMessageRes> {
  const res = await api.post('/chat/rooms/messages', req);
  return res.data as SendMessageRes;
}

/** ====== 내 쪽 채팅방 삭제 (상대방에게는 유지) ====== */
export async function deleteRoom(roomId: number): Promise<void> {
  await api.delete(`/chat/rooms/${roomId}`);
}

/** ====== 읽음 처리 (명세: POST /chat/rooms/{roomId}/read -> { unreadCount: number }) ====== */
/** ⚠️ storage의 markRoomRead(로컬)와 이름 충돌 피하려면 이 이름을 사용하세요. */
export async function markRoomRead(roomId: number, lastMessageId?: number): Promise<number> {
  // 명세상 body 미정이면 빈 객체로. (서버가 lastMessageId 받도록 했으면 아래 주석 교체)
  // const { data } = await api.post(`/chat/rooms/${roomId}/read`, lastMessageId ? { lastMessageId } : {});
  const { data } = await api.post(`/chat/rooms/${roomId}/read`, {});
  // 서버가 숫자만 주거나 { unreadCount } 둘 다 허용
  const n = typeof data === 'number' ? data : (data?.unreadCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}
