// hooks/useChatRoom.ts
// -------------------------------------------------------------
// - 고유 ID 생성기 / 중복 ID 자동수정
// - senderEmail/senderId 저장 (좌/우 버블 판정)
// - system/이미지/텍스트 지원
// - initialMessage 1회 시딩
// - ChatList 미리보기/닉네임 동기화
// - ★ 메시지 저장 키를 "계정별"로 분리 (중요)
// -------------------------------------------------------------

import { markRoomRead, refreshUnreadForRoom, updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

const STORAGE_PREFIX = 'chat_messages_'; // 최종 키: {identity}::chat_messages_{roomId}

/** 계정별 메시지 키 */
async function messageKey(roomId: string) {
  const { userEmail, userId } = await getLocalIdentity();
  const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : 'anon';
  return `${me}::${STORAGE_PREFIX}${roomId}`;
}

/** 옵션 */
export type UseChatRoomOpts = {
  originParams?: any;
  nickname?: string;
};

let __seq = 0;
function makeMsgId(prefix: 'm-' | 'img-' | 'sys-') {
  const ts = Date.now();
  __seq = (__seq + 1) & 0xffff;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}_${__seq}_${rand}`;
}

function fixDuplicateIds(arr: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  return arr.map((m) => {
    let id = m.id;
    while (seen.has(id)) id = `${id}_${Math.random().toString(36).slice(2, 6)}`;
    seen.add(id);
    return id === m.id ? m : { ...m, id };
  });
}

function previewForBatch(created: ChatMessage[]): string {
  if (!created.length) return '';
  const textMsg = created.find((m) => m.type === 'text') as Extract<ChatMessage, { type: 'text' }> | undefined;
  if (textMsg) return textMsg.text;
  const imgCount = created.filter((m) => m.type === 'image').length;
  if (imgCount > 0) return imgCount > 1 ? `사진 ${imgCount}장` : '사진';
  const last = created[created.length - 1] as any;
  return last?.type === 'image' ? '사진' : (last?.text ?? '');
}

export default function useChatRoom(
  roomId: string,
  initialMessage?: string,
  opts: UseChatRoomOpts = {}
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [extraBottomPad, setExtraBottomPad] = useState(0);

  const originParams = opts?.originParams;
  const nickname = opts?.nickname;

  const seedingDoneRef = useRef(false);
  const loadingRef = useRef(false);
  const validRoomId = typeof roomId === 'string' && roomId.trim().length > 0;

  useEffect(() => { seedingDoneRef.current = false; }, [roomId]);

  const persist = useCallback(
    async (arr: ChatMessage[]) => {
      if (!validRoomId) return;
      try {
        const fixed = fixDuplicateIds(arr);
        const key = await messageKey(roomId);
        await AsyncStorage.setItem(key, JSON.stringify(fixed));
      } catch (e) {
        console.log('persist chat error', e);
      }
    },
    [roomId, validRoomId]
  );

  const send = useCallback(
    async (textOrEmpty?: string, serverRoomId?: number) => {  // ✅ serverRoomId 파라미터 추가
      if (!validRoomId) return;
      try {
        const { userEmail, userId } = await getLocalIdentity();
        const myIdStr = userId != null ? String(userId) : null;
        const nowIso = new Date().toISOString();
        const created: ChatMessage[] = [];

        // ✅ 이미지 업로드 처리 추가
        if (attachments.length > 0) {
          for (const uri of attachments) {
            // 1) 로컬 메시지 즉시 추가 (로딩 표시용)
            created.push({
              id: makeMsgId('img-'),
              type: 'image',
              uri,
              time: nowIso,
              senderEmail: userEmail ?? null,
              senderId: myIdStr,
              mine: true,
            });

            // 2) 서버 업로드 시도
            if (serverRoomId) {
              try {
                const { uploadImageMessage } = await import('@/api/chat');
                
                // 파일명과 MIME type 추출
                const fileName = uri.split('/').pop() ?? `image_${Date.now()}.jpg`;
                const fileType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

                await uploadImageMessage({
                  roomId: serverRoomId,
                  file: {
                    uri,
                    name: fileName,
                    type: fileType,
                  },
                });
                console.log('[useChatRoom] ✅ 이미지 업로드 성공:', uri);
              } catch (uploadError) {
                console.log('[useChatRoom] ⚠️ 이미지 업로드 실패:', uploadError);
                // 업로드 실패해도 로컬 메시지는 유지 (오프라인 대응)
              }
            }
          }
        }
        const text = (textOrEmpty ?? '').trim();
        if (text.length > 0) {
          created.push({
            id: makeMsgId('m-'),
            type: 'text',
            text,
            time: nowIso,
            senderEmail: userEmail ?? null,
            senderId: myIdStr,
            mine: true,
          });
        }
        if (created.length === 0) return;

        setAttachments([]);

        setMessages((prev) => {
          const next = fixDuplicateIds([...prev, ...created]);
          void persist(next);

          const preview = previewForBatch(created);
          void updateRoomOnSendSmart({ roomId, originParams, preview, nickname });

          const src = (originParams?.source ?? originParams?.category) as 'market' | 'lost' | 'groupbuy' | undefined;
          const category = src === 'lost' ? 'lost' : src === 'groupbuy' ? 'group' : 'market';
          void upsertRoomOnOpen({
            roomId,
            category,
            nickname: nickname ?? '상대방',
            productTitle: originParams?.productTitle,
            productPrice: originParams?.productPrice,
            productImageUri: originParams?.productImageUri,
            preview,
            origin: { source: src ?? 'market', params: originParams },
          });

          setTimeout(() => {
            DeviceEventEmitter.emit('EVT_CHAT_LIST_NEEDS_REFRESH');
          }, 0);

          const last = created[created.length - 1];
          void (async () => {
            try {
              await updateRoomOnSendSmart({
                roomId,
                originParams,
                preview,
                lastTs: new Date(last.time).getTime(),
                nickname,
              });
            } catch {}
          })();

          return next;
        });
      } catch (e) {
        console.log('send error', e);
      }
    },
    [attachments, validRoomId, persist, roomId, originParams, nickname]
  );

  const loadAndSeed = useCallback(async () => {
    if (!validRoomId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const key = await messageKey(roomId);
      const raw = await AsyncStorage.getItem(key);
      const loaded: ChatMessage[] = raw ? JSON.parse(raw) : [];
      const fixed = fixDuplicateIds(loaded);
      setMessages(fixed);
      if (fixed.length !== loaded.length || fixed.some((m, i) => m.id !== (loaded[i]?.id ?? ''))) {
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
  }, [validRoomId, roomId, initialMessage, persist, send]);

  useEffect(() => { void loadAndSeed(); }, [loadAndSeed]);

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
          if (!cancelled) await refreshUnreadForRoom(roomId, me.toLowerCase());
        } catch (e) {
          console.log('focus read error', e);
        }
      })();
      return () => { cancelled = true; };
    }, [roomId, validRoomId])
  );

  const addAttachments = useCallback((uris: string[]) => {
    setAttachments((prev) => [...prev, ...uris]);
    setExtraBottomPad(0);
  }, []);
  const removeAttachmentAt = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const syncPreviewSmart = useCallback(
    async (preview: string, isoTime: string) => {
      try {
        const ts = new Date(isoTime).getTime();
        await updateRoomOnSendSmart({ roomId, originParams, preview, lastTs: ts, nickname });
      } catch (e) {
        console.log('syncPreviewSmart error', e);
      }
    },
    [roomId, originParams, nickname]
  );

  const pushSystemAppointment = useCallback(
    (date: string, time: string, place: string) => {
      if (!validRoomId) return;
      const msg: ChatMessage = {
        id: makeMsgId('sys-'),
        type: 'system',
        text: `✨ 약속 제안 ✨\n날짜: ${date} / 시간: ${time} / 장소: ${place}`,
        time: new Date().toISOString(),
        senderEmail: null,
        senderId: null,
      };
      setMessages((prev) => {
        const next = fixDuplicateIds([...prev, msg]);
        void persist(next);
        void syncPreviewSmart(msg.text, msg.time);
        return next;
      });
    },
    [validRoomId, persist, syncPreviewSmart]
  );

  return {
    messages,
    setMessages,
    attachments,
    extraBottomPad,
    loadAndSeed,
    addAttachments,
    removeAttachmentAt,
    send,  // (textOrEmpty?: string, serverRoomId?: number) => Promise<void>
    pushSystemAppointment,
  };
}
