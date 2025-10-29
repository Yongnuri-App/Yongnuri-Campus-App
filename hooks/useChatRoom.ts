// hooks/useChatRoom.ts
// -------------------------------------------------------------
// 채팅방 로직 훅 (ID 충돌 방지 + 시딩 1회 보장 + 리스트 미리보기/닉네임 동기화)
// - 고유 ID 생성기(makeMsgId) (timestamp + seq + random)
// - 로드/저장 시 중복 ID 자동 수정(fixDuplicateIds)
// - senderEmail(우선)/senderId(폴백) 저장
// - system/이미지/텍스트 메시지 지원
// - initialMessage 시딩 1회 보장(StrictMode/포커스 중복 방지)
// - 전송/시스템메시지 후 ChatList 미리보기 즉시 갱신
// - ✅ roomId 미확정(빈값)일 때는 어떤 저장/시딩도 하지 않음(안전 가드)
// - ✅ roomId 변경 시 시딩 가드 리셋(정규 roomId로 전환 시 시딩 보장)
// - ✅ 미리보기 갱신 시 updateRoomOnSendSmart 사용(맥락 기반 동기화)
// -------------------------------------------------------------

import { updateRoomOnSendSmart, upsertRoomOnOpen } from '@/storage/chatStore';
import { DeviceEventEmitter } from 'react-native';
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'chat_messages_'; // 방별 메시지 저장 키: chat_messages_{roomId}

/** 외부에서 전달할 선택 옵션 */
type UseChatRoomOpts = {
  /** ChatRoom에 넘겨준 원본 네비게이션 params(raw) — 스마트 동기화에 사용 */
  originParams?: any;
  /** 계산된 상대 닉네임(헤더 타이틀) — 리스트 닉네임 동기화에 사용 */
  nickname?: string;
};

let __seq = 0;
/** ✅ 고유 ID 생성기: 같은 ms/이중 클릭/동시 전송에도 충돌 방지 */
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
 * @param roomId - 방 ID (예: m_<post>__s_<seller>__b_<buyer>) — 반드시 유효한 문자열이어야 저장/전송이 수행됩니다.
 * @param initialMessage - 최초 진입 시 대화가 비어있다면 한 번만 자동 시딩할 텍스트
 * @param opts - 스마트 동기화용 originParams/닉네임
 */
export default function useChatRoom(
  roomId: string,
  initialMessage?: string,
  opts?: {
    originParams?: any;   // ChatRoomPage에서 넘겨주는 enriched
    nickname?: string;    // headerTitle
  }
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [extraBottomPad, setExtraBottomPad] = useState(0);

  const { originParams, nickname } = opts;

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
    if (!validRoomId) return; // ✅ 미확정이면 저장 금지
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

      // ✅ 최초 진입 + 아직 시딩 안했고 + 대화가 비어있을 때만 1회 시딩
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

  /** 첨부 제어 */
  const addAttachments = useCallback((uris: string[]) => {
    setAttachments(prev => [...prev, ...uris]);
    setExtraBottomPad(0);
  }, []);
  const removeAttachmentAt = useCallback((idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  /** 공통: 리스트 미리보기/닉네임 스마트 동기화 */
  const syncPreviewSmart = useCallback(async (preview: string, isoTime: string) => {
    try {
      const ts = new Date(isoTime).getTime();
      await updateRoomOnSendSmart({
        roomId,               // 우선 roomId로 시도
        originParams,         // 실패 시 맥락으로 역탐색
        preview,
        lastTs: ts,
        nickname,             // 계산된 상대 닉네임도 함께 동기화
      });
    } catch (e) {
      console.log('syncPreviewSmart error', e);
    }
  }, [roomId, originParams, nickname]);

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

      if (created.length === 0) return;

      // 첨부 초기화
      setAttachments([]);

      // 메시지 상태/저장 + 리스트 미리보기 갱신
      setMessages(prev => {
        const next = fixDuplicateIds([...prev, ...created]);
        void persist(next);

        // ✅ ChatList 미리보기/닉네임 스마트 동기화
        const preview = previewForBatch(created);
        // ✅ ChatList 미리보기 + 닉네임 동기화(스마트)
        void updateRoomOnSendSmart({
          roomId,
          originParams: opts?.originParams,
          preview,
          nickname: opts?.nickname,
        });

        // ✅ (선택) 낙관적 방 생성/업데이트 — 서버 리스트 반영 전에도 로컬 리스트에 보이게
        const src = (opts?.originParams?.source ?? opts?.originParams?.category) as 'market'|'lost'|'groupbuy'|undefined;
        const category = src === 'lost' ? 'lost' : src === 'groupbuy' ? 'group' : 'market';
        void upsertRoomOnOpen({
          roomId,
          category,
          nickname: opts?.nickname ?? '상대방',
          productTitle: opts?.originParams?.productTitle,
          productPrice: opts?.originParams?.productPrice,
          productImageUri: opts?.originParams?.productImageUri,
          preview,
          origin: { source: src ?? 'market', params: opts?.originParams },
        });

        // ✅ ChatList에게 “새로고침해!” 이벤트 쏘기
        DeviceEventEmitter.emit('EVT_CHAT_LIST_NEEDS_REFRESH');
                const last = created[created.length - 1];
                void syncPreviewSmart(preview, last.time);

                return next;
              });
            } catch (e) {
              console.log('send error', e);
            }
          }, [attachments, persist, validRoomId, syncPreviewSmart]);

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

      // ✅ ChatList 미리보기/닉네임 스마트 동기화
      void syncPreviewSmart(msg.text, msg.time);

      return next;
    });
  }, [persist, validRoomId, syncPreviewSmart]);

  return {
    messages, setMessages,
    attachments, extraBottomPad,
    loadAndSeed, addAttachments, removeAttachmentAt, send, pushSystemAppointment,
  };
}
