// hooks/useChatRoom.ts
// -------------------------------------------------------------
// 채팅방 로직 훅
// - 고유 ID 생성기 / 중복 ID 자동수정
// - senderEmail/senderId 저장 (좌/우 버블 판정용)
// - system/이미지/텍스트 지원
// - initialMessage 1회 시딩
// - ChatList 미리보기/닉네임 동기화
// - roomId 없으면 어떤 저장도 수행하지 않음 (가드)
// -------------------------------------------------------------

import { markRoomRead, refreshUnreadForRoom, updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

const STORAGE_PREFIX = 'chat_messages_'; // chat_messages_{roomId}

/** 외부 옵션 */
export type UseChatRoomOpts = {
  /** ChatRoom에 넘겨준 원본 네비 params(raw) — 스마트 동기화에 사용 */
  originParams?: any;
  /** 계산된 상대 닉네임(헤더 타이틀) — 리스트 닉네임 동기화에 사용 */
  nickname?: string;
};

let __seq = 0;
/** 고유 ID 생성기 */
function makeMsgId(prefix: 'm-' | 'img-' | 'sys-') {
  const ts = Date.now();
  __seq = (__seq + 1) & 0xffff;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}_${__seq}_${rand}`;
}

/** 배열 내 중복 ID 자동 수정 */
function fixDuplicateIds(arr: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const out = arr.map((m) => {
    let id = m.id;
    while (seen.has(id)) id = `${id}_${Math.random().toString(36).slice(2, 6)}`;
    seen.add(id);
    return id === m.id ? m : { ...m, id };
  });
  return out;
}

/** 미리보기 문구 */
function previewForBatch(created: ChatMessage[]): string {
  if (!created.length) return '';
  const textMsg = created.find((m) => m.type === 'text') as Extract<
    ChatMessage,
    { type: 'text' }
  > | undefined;
  if (textMsg) return textMsg.text;

  const imgCount = created.filter((m) => m.type === 'image').length;
  if (imgCount > 0) return imgCount > 1 ? `사진 ${imgCount}장` : '사진';

  const last = created[created.length - 1] as any;
  return last?.type === 'image' ? '사진' : (last?.text ?? '');
}

export default function useChatRoom(
  roomId: string,
  initialMessage?: string,
  opts: UseChatRoomOpts = {} // ✅ 기본값 제공(옵션이 undefined여도 안전)
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [extraBottomPad, setExtraBottomPad] = useState(0);

  // ✅ opts가 undefined일 수 있으니 안전 접근 (구조분해 X)
  const originParams = opts?.originParams;
  const nickname = opts?.nickname;

  // 가드
  const seedingDoneRef = useRef(false);
  const loadingRef = useRef(false);
  const validRoomId = typeof roomId === 'string' && roomId.trim().length > 0;

  // roomId 변경 시 시딩 가드 리셋
  useEffect(() => {
    seedingDoneRef.current = false;
  }, [roomId]);

  /** 저장 */
  const persist = useCallback(
    async (arr: ChatMessage[]) => {
      if (!validRoomId) return;
      try {
        const fixed = fixDuplicateIds(arr);
        await AsyncStorage.setItem(STORAGE_PREFIX + roomId, JSON.stringify(fixed));
      } catch (e) {
        console.log('persist chat error', e);
      }
    },
    [roomId, validRoomId]
  );

  /** 전송 (텍스트/이미지) */
  const send = useCallback(
    async (textOrEmpty?: string) => {
      if (!validRoomId) return;

      try {
        const { userEmail, userId } = await getLocalIdentity();
        const myIdStr = userId != null ? String(userId) : null; // ✅ 문자열화
        const nowIso = new Date().toISOString();

        const created: ChatMessage[] = [];

        // 1) 이미지 첨부
        if (attachments.length > 0) {
          for (const uri of attachments) {
            created.push({
              id: makeMsgId('img-'),
              type: 'image',
              uri,
              time: nowIso,
              senderEmail: userEmail ?? null,
              senderId: myIdStr,
              mine: true,
            });
          }
        }

        // 2) 텍스트
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

          // 미리보기/닉네임 동기화
          void updateRoomOnSendSmart({
            roomId,
            originParams,
            preview,
            nickname,
          });

          // 낙관적 방 업데이트(리스트 반영)
          const src = (originParams?.source ?? originParams?.category) as
            | 'market'
            | 'lost'
            | 'groupbuy'
            | undefined;
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

          // 리스트 새로고침 이벤트
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

  /** 로드 + 최초 시딩 */
  const loadAndSeed = useCallback(async () => {
    if (!validRoomId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + roomId);
      const loaded: ChatMessage[] = raw ? JSON.parse(raw) : [];
      const fixed = fixDuplicateIds(loaded);
      setMessages(fixed);

      if (
        fixed.length !== loaded.length ||
        fixed.some((m, i) => m.id !== (loaded[i]?.id ?? ''))
      ) {
        await persist(fixed);
      }

      // 비어있고 아직 시딩 전이면 한 번만 시딩
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

  // 마운트/roomId 변경 시 로드
  useEffect(() => {
    void loadAndSeed();
  }, [loadAndSeed]);

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
    setAttachments((prev) => [...prev, ...uris]);
    setExtraBottomPad(0);
  }, []);
  const removeAttachmentAt = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // const send = useCallback(async (textOrEmpty?: string) => {
  //   if (!validRoomId) return;

  //   try {
  //     const { userEmail, userId } = await getLocalIdentity();
  //     const nowIso = new Date().toISOString();

  //     const created: ChatMessage[] = [];

  //     // 1) 이미지 첨부 → 각 이미지별 별도 메시지로
  //     if (attachments.length > 0) {
  //       for (const uri of attachments) {
  //         created.push({
  //           id: makeMsgId('img-'),
  //           type: 'image',
  //           uri,
  //           time: nowIso,
  //           senderEmail: userEmail ?? null,
  //           senderId: userEmail ? null : (userId ?? null),
  //         });
  //       }
  //     }
  
  /** 미리보기 동기화 (별도 노출용) */
  const syncPreviewSmart = useCallback(
    async (preview: string, isoTime: string) => {
      try {
        const ts = new Date(isoTime).getTime();
        await updateRoomOnSendSmart({
          roomId,
          originParams,
          preview,
          lastTs: ts,
          nickname,

        });
      } catch (e) {
        console.log('syncPreviewSmart error', e);
      }
    },
    [roomId, originParams, nickname]
  );

  /** 시스템(약속) 메시지 */
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
    send,
    pushSystemAppointment,
  };
}
