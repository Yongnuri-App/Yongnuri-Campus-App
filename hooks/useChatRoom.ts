import { appendOutboxImage, appendOutboxText, loadMessages } from '@/storage/chatMessagesStore';
import { updateRoomOnSend /*, markRoomRead*/ } from '@/storage/chatStore';
import type { ChatMessage } from '@/types/chat';
import { ensureDisplayTimes, formatKoreanTime } from '@/utils/chatTime';
import { useCallback, useRef, useState } from 'react';

/**
 * useChatRoom
 * - 채팅 페이지 공통 로직 묶음
 *   1) 메시지: 로드/초기 시딩/전송
 *   2) 첨부 썸네일: 추가/제거/전송 후 초기화
 *   3) 리스트 프리뷰(updateRoomOnSend) 동기화
 *
 * @param roomId         채팅방 고유 ID (없으면 로직 수행 방지)
 * @param initialMessage 상세→채팅 최초 진입 시 자동으로 보내줄 첫 문구(옵션)
 */
export default function useChatRoom(roomId: string | null, initialMessage?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const seededRef = useRef(false);
  const extraBottomPad = attachments.length > 0 ? 96 : 0;

  const loadAndSeed = useCallback(async () => {
    if (!roomId) return;

    // 1) 저장된 메시지 로드
    const stored = await loadMessages(roomId);
    setMessages(ensureDisplayTimes(stored));

    // 2) 최초 시딩
    if (!seededRef.current && initialMessage?.trim()) {
      const next = await appendOutboxText(roomId, initialMessage.trim());
      setMessages(ensureDisplayTimes(next));
      await updateRoomOnSend(roomId, initialMessage.trim());
      seededRef.current = true;
    }

    // 3) (옵션) 읽음 처리
    // await markRoomRead(roomId);
  }, [roomId, initialMessage]);

  const addAttachments = useCallback((uris: string[]) => {
    if (!uris?.length) return;
    setAttachments(prev => [...prev, ...uris]);
  }, []);

  const removeAttachmentAt = useCallback((idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const send = useCallback(async (text: string) => {
    if (!roomId) return;

    const trimmed = text.trim();
    let current: ChatMessage[] | null = null;
    const beforeCount = attachments.length;

    // 1) 이미지 먼저
    if (attachments.length > 0) {
      for (const uri of attachments) {
        const next = await appendOutboxImage(roomId, uri);
        current = next;
      }
      if (current) setMessages(ensureDisplayTimes(current));
      setAttachments([]);
    }

    // 2) 텍스트
    if (trimmed) {
      const next = await appendOutboxText(roomId, trimmed);
      setMessages(ensureDisplayTimes(next));
    }

    // 3) 프리뷰 갱신
    if (trimmed) {
      await updateRoomOnSend(roomId, trimmed);
    } else if (beforeCount > 0) {
      const label = beforeCount === 1 ? '사진 1장' : `사진 ${beforeCount}장`;
      await updateRoomOnSend(roomId, label);
    }
  }, [roomId, attachments]);

  const pushSystemAppointment = useCallback((date?: string, time?: string, place?: string) => {
    if (!roomId) return;
    if (!date || !time || !place) return;

    const proposal = `📅 약속 제안\n- 날짜: ${date}\n- 시간: ${time}\n- 장소: ${place}`;
    const msg: ChatMessage = {
      id: `apt_${Date.now()}`,
      type: 'text',
      text: proposal,
      time: formatKoreanTime(),
      mine: true,
    };
    setMessages(prev => [...prev, msg]);

    // TODO: 저장/프리뷰 실제 연동
    // appendOutboxText(roomId, proposal);
    // updateRoomOnSend(roomId, '약속 제안');
  }, [roomId]);

  return {
    messages,
    setMessages,
    attachments,
    extraBottomPad,
    loadAndSeed,
    addAttachments,
    removeAttachmentAt,
    send,
    pushSystemAppointment,
  };
}
