// /src/utils/chatTime.ts
// RN/Expo + TS 공용 채팅 시간 유틸
// - formatKoreanTime: "오전/오후 HH:MM" 12시간제 포맷
// - ensureDisplayTimes: 저장된 time을 UI 표기 문자열로 보정

import type { ChatMessage } from '@/types/chat';

/** Date 유사 객체 판별 (instanceof 대신 프로퍼티 체크로 TS 에러 회피) */
const isDateLike = (v: unknown): v is Date => {
  return !!v && typeof v === 'object' && typeof (v as any).getTime === 'function';
};

/**
 * 현재(또는 전달된) 시간을 "오전/오후 HH:MM" 12시간제로 변환
 * - 0시는 "오전 12:MM", 12시는 "오후 12:MM"
 * - 항상 2자리 패딩
 */
export const formatKoreanTime = (d: Date = new Date()): string => {
  const h24 = d.getHours();
  const m = d.getMinutes();
  const ampm = h24 < 12 ? '오전' : '오후';
  const h12 = ((h24 + 11) % 12) + 1; // 0→12, 13→1
  const hh = String(h12).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${ampm} ${hh}:${mm}`;
};

/**
 * 저장된 ChatMessage의 time을 UI 표기용 문자열로 보정
 * - 이미 "오전/오후 HH:MM"이면 그대로 둠(중복 포맷 방지)
 * - ISO 문자열/숫자 타임스탬프/Date 유사 객체 처리
 * - time이 비어있거나 파싱 실패 시 현재 시각으로 대체
 */
export const ensureDisplayTimes = (items: ChatMessage[]): ChatMessage[] =>
  items.map((m) => {
    // 타입 정의상 time이 string이라도, 실제 저장소에서는 number/Date가 들어올 수 있어 any로 읽음
    const timeVal: unknown = (m as any).time;

    // 이미 화면 표기 문자열이면 그대로 반환
    if (typeof timeVal === 'string' && (timeVal.includes('오전') || timeVal.includes('오후'))) {
      return m;
    }

    let d: Date;
    if (isDateLike(timeVal)) {
      d = timeVal;
    } else if (typeof timeVal === 'number') {
      d = new Date(timeVal);
    } else if (typeof timeVal === 'string') {
      const maybe = new Date(timeVal);
      d = isNaN(maybe.getTime()) ? new Date() : maybe;
    } else {
      d = new Date();
    }

    return { ...m, time: formatKoreanTime(d) };
  });
