//storage/chatMessagesStore.ts
// -----------------------------------------------------------
// 채팅방별 메시지 로그 AsyncStorage(JSON) 유틸
// - 메시지 저장 키: chat_msgs_v1:{roomId}
// - ❗ 이미지 메시지 구조를 imageUris/count로 통일(프리뷰 라벨과 일치)
// - (옵션) 방 아이디 변경 시 메시지 이관 함수 제공
// -----------------------------------------------------------

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

/** (옵션) 방 아이디가 바뀌었을 때 메시지 이관 */
export async function moveMessagesRoom(oldRoomId: string, newRoomId: string) {
  if (!oldRoomId || !newRoomId || oldRoomId === newRoomId) return;
  const list = await loadMessages(oldRoomId);
  if (!list.length) return;
  await persist(newRoomId, list);
  await persist(oldRoomId, []); // 원한다면 보존/삭제 정책에 맞춰 조정
}

/** 공통: 고유 메시지 id 생성 */
function genMsgId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 아웃박스 텍스트 메시지 추가(내가 보낸 메시지) */
export async function appendOutboxText(roomId: string, text: string): Promise<ChatMessage[]> {
  const list = await loadMessages(roomId);
  const msg: ChatMessage = {
    id: genMsgId('out'),
    type: 'text',
    text,
    time: new Date().toISOString(), // 표시 포맷은 화면에서 처리
    mine: true,
  };
  const next = [...list, msg];
  await persist(roomId, next);
  return next;
}

/** 인박스 텍스트 메시지 추가(상대가 보낸 메시지) */
export async function appendInboxText(roomId: string, text: string): Promise<ChatMessage[]> {
  const list = await loadMessages(roomId);
  const msg: ChatMessage = {
    id: genMsgId('in'),
    type: 'text',
    text,
    time: new Date().toISOString(),
    mine: false,
  };
  const next = [...list, msg];
  await persist(roomId, next);
  return next;
}

/** 이미지 메시지 추가(내가 보낸) — 미리보기 로직과 동일 스키마(imageUris/count) 사용 */
export async function appendOutboxImage(roomId: string, uri: string): Promise<ChatMessage[]> {
  const list = await loadMessages(roomId);
  const msg: ChatMessage = {
    id: genMsgId('img'),
    type: 'image',
    imageUris: [uri],
    count: 1,
    uri,
    time: new Date().toISOString(),
    mine: true,
  } as any;
  const next = [...list, msg];
  await persist(roomId, next);
  return next;
}

/** ✅ 시스템 메시지도 영구 저장 */
export async function appendSystemMessage(roomId: string, text: string): Promise<ChatMessage[]> {
  const list = await loadMessages(roomId);
  const msg: ChatMessage = {
    id: genMsgId('sys'),
    type: 'system',
    text,
    time: new Date().toISOString(), // 정렬 안전
    mine: false,
  } as any;
  const next = [...list, msg];
  await persist(roomId, next);
  return next;
} 
