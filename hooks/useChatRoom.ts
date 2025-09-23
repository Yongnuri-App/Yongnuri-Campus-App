// hooks/useChatRoom.ts
// -------------------------------------------------------------
// 채팅방 로직 훅 (ID 충돌 방지 + 시딩 1회 보장 + 리스트 미리보기 갱신)
// - 고유 ID 생성기(makeMsgId) (timestamp + seq + random)
// - 로드/저장 시 중복 ID 자동 수정(fixDuplicateIds)
// - senderEmail(우선)/senderId(폴백) 저장
// - system/이미지/텍스트 메시지 지원
// - initialMessage 시딩 1회 보장(StrictMode/포커스 중복 방지)
// - 전송/시스템메시지 후 ChatList 미리보기 즉시 갱신
// -------------------------------------------------------------
import { updateRoomOnSend } from '@/storage/chatStore';
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'chat_messages_';

/** ✅ 고유 ID 생성기: 같은 ms/이중 클릭/동시 전송에도 충돌 방지 */
let __seq = 0;
function makeMsgId(prefix: 'm-' | 'img-' | 'sys-') {
  const ts = Date.now();
  __seq = (__seq + 1) & 0xffff;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}_${__seq}_${rand}`;
}

/** ✅ 배열 내 중복 ID를 자동 수정(뒤에 짧은 랜덤 suffix 부여) */
function fixDuplicateIds(arr: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const out = arr.map((m) => {
    let id = m.id;
    while (seen.has(id)) {
      id = `${id}_${Math.random().toString(36).slice(2, 6)}`;
    }
    seen.add(id);
    return id === m.id ? m : { ...m, id };
  });
  return out;
}

/** ✅ 미리보기 문구 생성(배치 전송 대응) */
function previewForBatch(created: ChatMessage[]): string {
  if (!created.length) return '';
  // 텍스트가 있으면 텍스트 우선
  const textMsg = created.find((m) => m.type === 'text') as Extract<ChatMessage, { type: 'text' }> | undefined;
  if (textMsg) return textMsg.text;

  // 전부 이미지면 개수로 표시
  const imgCount = created.filter((m) => m.type === 'image').length;
  if (imgCount > 0) return imgCount > 1 ? `사진 ${imgCount}장` : '사진';

  // 그 외(시스템 등)는 마지막 텍스트
  const last = created[created.length - 1];
  return last.type === 'image' ? '사진' : (last as any).text ?? '';
}

export default function useChatRoom(roomId: string, initialMessage?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [extraBottomPad, setExtraBottomPad] = useState(0);

  // ✅ 시딩/로딩 중복 방지 가드
  const seedingDoneRef = useRef(false); // initialMessage 시딩 1회 보장
  const loadingRef = useRef(false);     // 동시 로드 방지

  /** 저장 */
  const persist = useCallback(async (arr: ChatMessage[]) => {
    try {
      const fixed = fixDuplicateIds(arr);
      await AsyncStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(fixed));
    } catch (e) {
      console.log('persist chat error', e);
    }
  }, [roomId]);

  /** 로드 + (최초 시딩) */
  const loadAndSeed = useCallback(async () => {
    if (loadingRef.current) return; // 동시 호출 방지
    loadingRef.current = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + roomId);
      const loaded: ChatMessage[] = raw ? JSON.parse(raw) : [];
      const fixed = fixDuplicateIds(loaded);
      setMessages(fixed);
      if (fixed.length !== loaded.length || fixed.some((m, i) => m.id !== loaded[i]?.id)) {
        await persist(fixed); // 중복이 있었으면 즉시 저장 반영
      }

      // ✅ 최초 진입 + 아직 시딩 안했고 + 대화가 비어있을 때만 1회 시딩
      if (!seedingDoneRef.current && initialMessage && fixed.length === 0) {
        seedingDoneRef.current = true; // 다시 못 들어오게 플래그
        await send(initialMessage);
      }
    } catch (e) {
      console.log('loadAndSeed error', e);
      setMessages([]);
    } finally {
      loadingRef.current = false;
    }
  }, [roomId, initialMessage, persist]); // send는 아래에서 정의되므로 의존성 분리

  useEffect(() => { void loadAndSeed(); }, [loadAndSeed]);

  /** 첨부 제어 */
  const addAttachments = useCallback((uris: string[]) => {
    setAttachments(prev => [...prev, ...uris]);
    setExtraBottomPad(0);
  }, []);
  const removeAttachmentAt = useCallback((idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  /** 전송 */
  const send = useCallback(async (textOrEmpty?: string) => {
    try {
      const { userEmail, userId } = await getLocalIdentity();
      const nowIso = new Date().toISOString();

      const created: ChatMessage[] = [];

      // 1) 이미지 첨부 → 각 이미지별 별도 메시지로
      if (attachments.length > 0) {
        for (const uri of attachments) {
          created.push({
            id: makeMsgId('img-'),
            type: 'image',
            uri,
            time: nowIso,
            senderEmail: userEmail ?? null,
            senderId: userEmail ? null : (userId ?? null),
          });
        }
      }

      // 2) 텍스트 메시지
      const text = (textOrEmpty ?? '').trim();
      if (text.length > 0) {
        created.push({
          id: makeMsgId('m-'),
          type: 'text',
          text,
          time: nowIso,
          senderEmail: userEmail ?? null,
          senderId: userEmail ? null : (userId ?? null),
        });
      }

      if (created.length === 0) return;

      setAttachments([]);

      setMessages(prev => {
        const next = fixDuplicateIds([...prev, ...created]);
        void persist(next);

        // ✅ ChatList 미리보기 갱신 (마지막 생성 메시지 기준 시간)
        const last = created[created.length - 1];
        const ts = new Date(last.time).getTime();
        const preview = previewForBatch(created);
        void updateRoomOnSend(roomId, preview, ts);

        return next;
      });
    } catch (e) {
      console.log('send error', e);
    }
  }, [attachments, persist, roomId]);

  /** 시스템(약속 등) 메시지 */
  const pushSystemAppointment = useCallback((date: string, time: string, place: string) => {
    const msg: ChatMessage = {
      id: makeMsgId('sys-'),
      type: 'system',
      text: `✨ 약속 제안 ✨\n날짜: ${date} / 시간: ${time} / 장소: ${place}`,
      time: new Date().toISOString(),
      senderEmail: null,
      senderId: null,
    };
    setMessages(prev => {
      const next = fixDuplicateIds([...prev, msg]);
      void persist(next);

      // ✅ ChatList 미리보기 갱신
      const ts = new Date(msg.time).getTime();
      void updateRoomOnSend(roomId, msg.text, ts);

      return next;
    });
  }, [persist, roomId]);

  return {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment,
  };
}
