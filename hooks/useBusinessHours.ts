// hooks/useBusinessHours.ts
// React Native (Expo, TS)
// - 운영시간(기본 09:00~18:00) 안/밖 계산
// - 관리자 설정(AsyncStorage)과 결합 가능(아래 InquiryPage에서 예시)

import { useEffect, useMemo, useState } from 'react';

export type BusinessHoursOptions = {
  /** 'HH:mm' 형태. 예: '09:00' */
  startHHmm?: string;
  /** 'HH:mm' 형태. 예: '18:00' */
  endHHmm?: string;
  /** 휴무 요일(0=일~6=토). 예: [0,6] → 주말 휴무 */
  closedWeekdays?: number[];
  /** 공휴일(YYYY-MM-DD). 예: ['2025-10-03'] */
  holidays?: string[];
  /** 현재 시간을 오버라이드(테스트용). 기본: new Date() */
  now?: Date;
  /** 타임존 라벨(표시만). 한국이면 'KST' 고정 */
  tzLabel?: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatNextOpen(next: Date) {
  // "10월 3일(목) 09:00" 처럼 간단 표기
  const wday = ['일','월','화','수','목','금','토'][next.getDay()];
  const mon = next.getMonth() + 1;
  const day = next.getDate();
  const hh = String(next.getHours()).padStart(2, '0');
  const mm = String(next.getMinutes()).padStart(2, '0');
  return `${mon}월 ${day}일(${wday}) ${hh}:${mm}`;
}

/**
 * 운영시간 계산 훅
 * - isOpen: 지금이 운영시간인지
 * - nextOpenAtLabel: 다음 오픈 예정(운영시간 밖일 때)
 */
export default function useBusinessHours({
  startHHmm = '09:00',
  endHHmm = '18:00',
  closedWeekdays = [],
  holidays = [],
  now = new Date(),
  tzLabel = 'KST',
}: BusinessHoursOptions = {}) {
  const [current, setCurrent] = useState<Date>(now);

  // 1분마다 현재시간 갱신 → isOpen 상태도 갱신
  useEffect(() => {
    const id = setInterval(() => setCurrent(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const { isOpen, nextOpenAt } = useMemo(() => {
    // 한국 서비스라 가정(KST, DST 없음). 서버 UTC와는 분리.
    const local = current;
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const weekday = local.getDay(); // 0~6
    const todayClosed =
      closedWeekdays.includes(weekday) || holidays.includes(todayStr);

    const startMin = toMinutes(startHHmm);
    const endMin = toMinutes(endHHmm);
    const nowMin = local.getHours() * 60 + local.getMinutes();

    const withinToday = !todayClosed && nowMin >= startMin && nowMin < endMin;

    if (withinToday) {
      return { isOpen: true, nextOpenAt: null as Date | null };
    }

    // 다음 오픈 시각 계산
    let probe = new Date(local);
    // 현재 시각 이전이면 오늘 오픈시간, 이미 영업 종료면 내일 이후
    if (nowMin < startMin && !todayClosed) {
      probe.setHours(Number(startHHmm.split(':')[0]), Number(startHHmm.split(':')[1]), 0, 0);
    } else {
      // 다음날 00:00로 이동해서 루프
      probe.setDate(probe.getDate() + 1);
      probe.setHours(0, 0, 0, 0);
      // 최대 14일 내에서 다음 오픈 탐색
      for (let i = 0; i < 14; i++) {
        const y = probe.getFullYear();
        const m = String(probe.getMonth() + 1).padStart(2, '0');
        const d = String(probe.getDate()).padStart(2, '0');
        const ds = `${y}-${m}-${d}`;
        const w = probe.getDay();
        const closed = closedWeekdays.includes(w) || holidays.includes(ds);
        if (!closed) {
          probe.setHours(Number(startHHmm.split(':')[0]), Number(startHHmm.split(':')[1]), 0, 0);
          break;
        }
        probe.setDate(probe.getDate() + 1);
      }
    }

    return { isOpen: false, nextOpenAt: probe as Date };
  }, [current, startHHmm, endHHmm, closedWeekdays, holidays]);

  const nextOpenAtLabel = useMemo(() => {
    if (!nextOpenAt) return '';
    return `${formatNextOpen(nextOpenAt)} ${tzLabel}`;
  }, [nextOpenAt, tzLabel]);

  return { isOpen, nextOpenAt, nextOpenAtLabel };
}
