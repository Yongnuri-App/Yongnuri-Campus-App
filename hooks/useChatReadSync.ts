// src/hooks/useChatReadSync.ts
import { useEffect, useRef } from 'react';
import { markRoomRead } from '@/api/chat';
import { applyServerUnreadCount } from '@/storage/chatStore';

type Opts = {
  roomId: number | null;
  lastMessageId?: number | null;
  enabled?: boolean;
};

/**
 * 채팅방 진입/메시지 변화 시 서버 읽음 처리 호출
 * - 명세: POST /chat/rooms/{roomId}/read -> { unreadCount: number }
 * - 서버 응답의 unreadCount를 로컬 목록 배지에 반영
 */
export default function useChatReadSync({ roomId, lastMessageId, enabled = true }: Opts) {
  const lastSigRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !roomId) return;

    const sig = `${roomId}|${lastMessageId ?? 'none'}`;
    if (lastSigRef.current === sig) return; // 중복 호출 방지

    lastSigRef.current = sig;

    (async () => {
      try {
        const unread = await markRoomRead(roomId, lastMessageId ?? undefined);
        await applyServerUnreadCount(roomId, unread);
      } catch {
        // 조용히 실패 (네트워크 불가/서버 오류 시 로컬 상태 유지)
      }
    })();
  }, [roomId, lastMessageId, enabled]);
}
