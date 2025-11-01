// /src/utils/chatMap.ts
// 서버 메시지 → 앱 표준 메시지 매핑 + 로컬/서버 중복 병합(강화판)

import type { ChatMessage } from '@/types/chat';

type ServerMsg = {
  senderId?: number | string | null;
  sender?: number | string | null;
  senderEmail?: string | null;
  message?: string | null;
  createdAt?: string;
  time?: string;
  timestamp?: string | number;
  type?: 'text' | 'img' | string;
};

const toIso = (v: any): string => {
  if (!v) return new Date().toISOString();
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(+d) ? new Date(v.replace(' ', 'T')).toISOString() : d.toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
};

const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

/** 서버 → 표준 ChatMessage 매핑 */
export function mapServerMsg(m: ServerMsg, myId?: string | null, myEmail?: string | null): ChatMessage {
  const senderIdRaw = (m?.senderId ?? m?.sender) as any;
  const senderId = senderIdRaw != null ? String(senderIdRaw) : null;
  const text = String(m?.message ?? '');
  const iso = toIso(m?.createdAt ?? m?.time ?? m?.timestamp);

  const mine =
    (myId && senderId && String(myId) === String(senderId)) ||
    (!!m?.senderEmail && !!myEmail && normEmail(m.senderEmail) === normEmail(myEmail));

  // 서버 메시지는 항상 고유 prefix로 id 생성(낙관 id와 구분)
  const base: ChatMessage = {
    id: `srv-${senderId ?? 'u'}-${iso}`,
    time: iso,
    senderId,
    senderEmail: m?.senderEmail ?? null,
    mine: mine || undefined,
    type: 'text',
    text,
  } as any;

  if ((m?.type ?? 'text') !== 'text') {
    // 이미지 등 확장 시 여기에 분기
  }

  return base;
}

/** 안전 파서 (ISO 문자열/number만 신뢰) */
function toMsSafe(t: any): number {
  if (typeof t === 'number') return t;
  if (typeof t === 'string') {
    const d = new Date(t);
    const n = d.getTime();
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** 메시지 레벨 중복 판단(텍스트 동일 + 보낸이 동일 + 시간 근접) */
function isSemanticDup(a: ChatMessage, b: ChatMessage, withinMs = 60_000): boolean {
  if (a.type !== 'text' || b.type !== 'text') return false;
  const sameSender =
    (a.senderId && b.senderId && String(a.senderId) === String(b.senderId)) ||
    (!!a.senderEmail && !!b.senderEmail && normEmail(a.senderEmail) === normEmail(b.senderEmail)) ||
    // 낙관 outbox id 힌트: 'out-' / 'm-' / 'img-'는 전송자=나
    ((String(a.id).startsWith('out-') || String(a.id).startsWith('m-')) &&
     (String(b.id).startsWith('srv-') || String(b.id).startsWith('in-') || String(b.id).startsWith('out-') || String(b.id).startsWith('m-')));

  if (!sameSender) return false;
  if ((a as any).text !== (b as any).text) return false;

  const ta = toMsSafe(a.time);
  const tb = toMsSafe(b.time);
  if (!ta || !tb) return false;

  return Math.abs(ta - tb) <= withinMs;
}

/**
 * 로컬 배열(prev) + 서버 msgs(serverMsgs) 병합
 * - 낙관(로컬) 메시지와 서버 에코를 의미기반(텍스트/보낸이/±60s)으로 1개로 합침
 * - 서버 쪽 타임/메타가 더 정확하므로, 중복이면 서버 버전으로 교체
 */
export function mergeServerMessages(
  prev: ChatMessage[],
  serverMsgs: ServerMsg[],
  myId?: string | null,
  myEmail?: string | null
): ChatMessage[] {
  const mineId = myId != null ? String(myId) : null;
  const mineEmail = myEmail ? normEmail(myEmail) : null;

  const next = [...prev];

  for (const sm of serverMsgs) {
    const mapped = mapServerMsg(sm, mineId, mineEmail);

    // 1) 완전 동일 id 이미 있으면 스킵
    if (next.find(x => x.id === mapped.id)) continue;

    // 2) 의미 중복(텍스트/발신자 동일 + ±60초) 찾기 → 서버 버전으로 교체
    const dupIdx = next.findIndex(x => isSemanticDup(x, mapped, 60_000));
    if (dupIdx >= 0) {
      next[dupIdx] = { ...mapped, mine: next[dupIdx].mine ?? mapped.mine };
      continue;
    }

    // 3) outbox 힌트: id prefix가 'out-' 또는 'm-' 인 내 메시지와도 중복 판단(보수적)
    const looseDup = next.findIndex(x =>
      (String(x.id).startsWith('out-') || String(x.id).startsWith('m-')) &&
      isSemanticDup(x, mapped, 120_000)
    );
    if (looseDup >= 0) {
      next[looseDup] = { ...mapped, mine: next[looseDup].mine ?? mapped.mine };
      continue;
    }

    // 4) 신규 추가
    next.push(mapped);
  }

  next.sort((a, b) => toMsSafe(a.time) - toMsSafe(b.time));
  return next;
}
