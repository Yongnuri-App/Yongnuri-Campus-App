// /src/storage/chatMessagesStore.ts
// 채팅방별 메시지 로그를 AsyncStorage(JSON)로 저장/로드하는 유틸
import type { ChatMessage } from '@/types/chat';
import { loadJson, saveJson } from '@/utils/storage';

const MSG_KEY_PREFIX = 'chat_msgs_v1:'; // 각 방은 chat_msgs_v1:{roomId}

/** 방별 스토리지 키 */
const keyOf = (roomId: string) => `${MSG_KEY_PREFIX}${roomId}`;

/** 특정 방의 메시지 배열 로드 (없으면 빈 배열) */
export async function loadMessages(roomId: string): Promise<ChatMessage[]> {
  return loadJson<ChatMessage[]>(keyOf(roomId), []);
}

/** 특정 방에 메시지 배열 저장 */
async function persist(roomId: string, messages: ChatMessage[]) {
  await saveJson(keyOf(roomId), messages);
}

/** 아웃박스 텍스트 메시지 추가(내가 보낸 메시지) */
export async function appendOutboxText(roomId: string, text: string): Promise<ChatMessage[]> {
  const list = await loadMessages(roomId);
  const msg: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'text',
    text,
    time: new Date().toISOString(), // 표시 포맷은 화면에서 처리
    mine: true,
  };
  const next = [...list, msg];
  await persist(roomId, next);
  return next;
}

/** 인박스 텍스트 메시지 추가(상대가 보낸 메시지) - 필요 시 사용 */
export async function appendInboxText(roomId: string, text: string): Promise<ChatMessage[]> {
  const list = await loadMessages(roomId);
  const msg: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'text',
    text,
    time: new Date().toISOString(),
    mine: false,
  };
  const next = [...list, msg];
  await persist(roomId, next);
  return next;
}

/** 이미지 메시지 추가(내가 보낸) - 필요 시 사용 */
export async function appendOutboxImage(roomId: string, uri: string): Promise<ChatMessage[]> {
  const list = await loadMessages(roomId);
  const msg: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'image',
    uri,
    time: new Date().toISOString(),
    mine: true,
  };
  const next = [...list, msg];
  await persist(roomId, next);
  return next;
}
