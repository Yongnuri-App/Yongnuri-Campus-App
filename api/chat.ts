// src/api/chat.ts
import { api } from './client';

export type ChatType = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY' | 'ADMIN' | 'ALL' | 'CHAT';
export type ChatMessageType = 'text' | 'img';

export type CreateRoomReq = {
  type: ChatType;
  typeId: number;     // 게시글 ID
  toUserId: number;   // 상대방 사용자 ID
  message: string;
  messageType: ChatMessageType;
};

export type CreateRoomRes = {
  roomInfo: {
    roomId: number;
    chatType: ChatType;
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
  messages: Array<{
    senderId: number;
    senderNickname: string;
    message: string;
    createdAt: string;
  }>;
};

export async function createOrGetRoom(body: CreateRoomReq): Promise<CreateRoomRes> {
  const res = await api.post('/chat/rooms', {
    ...body,
    messageType: body.messageType, // 서버는 'text' | 'img'
  });
  return res.data as CreateRoomRes;
}

// ✅ 방 상세 조회
export type GetRoomDetailRes = CreateRoomRes; // 응답 구조 동일

export async function getRoomDetail(roomId: number): Promise<GetRoomDetailRes> {
  const res = await api.get(`/chat/rooms/${roomId}`);
  return res.data as GetRoomDetailRes;
}
