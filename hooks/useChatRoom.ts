// hooks/useChatRoom.ts

import { markRoomRead, refreshUnreadForRoom, updateRoomOnSend } from '@/storage/chatStore';
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'chat_messages_'; // 방별 메시지 저장 키: chat_messages_{roomId}

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

/** ✅ 미리보기 문구 생성(배치 전송 대응: 이미지+텍스트 동시 전송 등) */
function previewForBatch(created: ChatMessage[]): string {
  if (!created.length) return '';
  const textMsg = created.find((m) => m.type === 'text') as Extract<ChatMessage, { type: 'text' }> | undefined;
  if (textMsg) return textMsg.text;
  const imgCount = created.filter((m) => m.type === 'image').length;
  if (imgCount > 0) return imgCount > 1 ? `사진 ${imgCount}장` : '사진';
  const last = created[created.length - 1];
  return last.type === 'image' ? '사진' : (last as any).text ?? '';
}

/**
 * 채팅방 훅
 * @param roomId - 방 ID — 반드시 유효한 문자열이어야 저장/전송이 수행됩니다.
 * @param initialMessage - 최초 진입 시 대화가 비어있다면 한 번만 자동 시딩할 텍스트
 */
export default function useChatRoom(roomId: string, initialMessage?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [extraBottomPad, setExtraBottomPad] = useState(0);

  // ✅ 시딩/로딩 중복 방지 가드
  const seedingDoneRef = useRef(false); // initialMessage 시딩 1회 보장
  const loadingRef = useRef(false);     // 동시 로드 방지

  // ✅ roomId 유효성 (빈 문자열/undefined 방지)
  const validRoomId = typeof roomId === 'string' && roomId.trim().length > 0;

  // ✅ roomId가 바뀔 때는 시딩 가드를 리셋 (정규 roomId 전환 시 재시딩 허용)
  useEffect(() => {
    seedingDoneRef.current = false;
  }, [roomId]);

  /** 저장 */
  const persist = useCallback(async (arr: ChatMessage[]) => {
    if (!validRoomId) return;
    try {
      const fixed = fixDuplicateIds(arr);
      await AsyncStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(fixed));
    } catch (e) {
      console.log('persist chat error', e);
    }
  }, [roomId, validRoomId]);

  /** 로드 + (최초 시딩) */
  const loadAndSeed = useCallback(async () => {
    if (!validRoomId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + roomId);
      const loaded: ChatMessage[] = raw ? JSON.parse(raw) : [];
      const fixed = fixDuplicateIds(loaded);
      setMessages(fixed);

      if (fixed.length !== loaded.length || fixed.some((m, i) => m.id !== loaded[i]?.id)) {
        await persist(fixed);
      }

      if (!seedingDoneRef.current && initialMessage && fixed.length === 0) {
        seedingDoneRef.current = true;
        await send(initialMessage);
      }
    } catch (e) {
      console.log('loadAndSeed error', e);
      setMessages([]);
    } finally {
      loadingRef.current = false;
    }
  }, [roomId, initialMessage, persist, validRoomId]);

  // 마운트/roomId 변경 시 로드
  useEffect(() => { void loadAndSeed(); }, [loadAndSeed]);

  /** ✅ 화면 포커스될 때 이 방을 읽음 처리 */
  useFocusEffect(
    useCallback(() => {
      if (!validRoomId) return;

      let cancelled = false;
      (async () => {
        try {
          const { userEmail, userId } = await getLocalIdentity();
          const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString() : '';
          if (!me) return;

          const now = Date.now();
          await markRoomRead(roomId, me, now);

          // 백그라운드에서 저장된 새 메시지 대비 한 번 더 재계산
          if (!cancelled) {
            await refreshUnreadForRoom(roomId, me.toLowerCase());
          }
        } catch (e) {
          console.log('focus read error', e);
        }
      })();

      return () => { cancelled = true; };
    }, [roomId, validRoomId])
  );

  /** 첨부 제어 */
  const addAttachments = useCallback((uris: string[]) => {
    setAttachments(prev => [...prev, ...uris]);
    setExtraBottomPad(0);
  }, []);
  const removeAttachmentAt = useCallback((idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  /** 전송 (텍스트/이미지) */
  const send = useCallback(async (textOrEmpty?: string) => {
    if (!validRoomId) return;

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

      // 보낼 게 없으면 종료
      if (created.length === 0) return;

      // 첨부 초기화
      setAttachments([]);

      // 메시지 상태/저장 + 리스트 미리보기 갱신
      setMessages(prev => {
        const next = fixDuplicateIds([...prev, ...created]);
        void persist(next);

        // ✅ ChatList 미리보기 갱신 (마지막 생성 메시지 기준 시간)
        const last = created[created.length - 1];
        const ts = new Date(last.time).getTime();
        const preview = previewForBatch(created);
        void updateRoomOnSend(roomId, preview, ts);

        // ✅ 내가 보낸 직후엔 내 unread=0 유지 (상대방 unread는 상대/서버에서)
        const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString() : '';
        if (me) {
          void markRoomRead(roomId, me, ts);
        }

        return next;
      });
    } catch (e) {
      console.log('send error', e);
    }
  }, [attachments, persist, roomId, validRoomId]);

  /** 시스템(약속 등) 메시지 */
  const pushSystemAppointment = useCallback((date: string, time: string, place: string) => {
    if (!validRoomId) return;

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
  }, [persist, roomId, validRoomId]);

  return {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment,
  };
}
