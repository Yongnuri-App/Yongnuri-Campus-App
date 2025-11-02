// utils/chatRoomHelpers.ts
import type { PostMeta } from '@/components/Chat/ChatHeader/ChatHeader';
import type { SaleStatusLabel } from '@/components/Chat/SaleStatusSelector/SaleStatusSelector';

/** ================== 날짜/시간 변환 ================== */

/** "2025년 11월 3일" → "2025-11-03" */
export function toServerDate(koreanDate: string): string | null {
  try {
    const m = koreanDate.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!y || !mo || !d) return null;
    const mm = String(mo).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

/** "오전 2시 05분" | "오후 12시 30분" → "HH:mm" (24시간) */
export function toServerTime(koreanTime: string): string | null {
  try {
    const m = koreanTime.match(/(오전|오후)\s*(\d{1,2})시\s*(\d{1,2})분/);
    if (!m) return null;
    const ap = m[1];
    let h = Number(m[2]);
    const min = Number(m[3]);
    if (ap === '오전') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h = h + 12;
    }
    const hh = String(h).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return null;
  }
}

/** ================== 판매 상태 매핑 ================== */

/** 한글 라벨 → 서버 Enum */
export function labelToServer(label: SaleStatusLabel): 'SELLING' | 'RESERVED' | 'SOLD' {
  switch (label) {
    case '판매중': return 'SELLING';
    case '예약중': return 'RESERVED';
    case '거래완료': return 'SOLD';
  }
}

/** 서버 Enum → 한글 라벨 */
export function serverToLabel(s: string): SaleStatusLabel {
  switch (s) {
    case 'ON_SALE': return '판매중';
    case 'RESERVED': return '예약중';
    case 'SOLD': return '거래완료';
    default: return '판매중';
  }
}

/** ================== 헤더 초기화 ================== */

export function initHeaderPost(raw: any): PostMeta | undefined {
  const isMarket = raw?.source === 'market';
  const isLost = raw?.source === 'lost';
  const isGroup = raw?.source === 'groupbuy';

  const src: PostMeta['source'] = isMarket ? 'market' : isLost ? 'lost' : 'group';
  const pid = String(raw?.postId ?? raw?.id ?? raw?.typeId ?? '');
  if (!pid) return undefined;

  const base: PostMeta = {
    source: src,
    postId: pid,
    title: raw?.productTitle || raw?.postTitle || '제목 없음',
    thumbnailUri: raw?.productImageUri || raw?.postImageUri,
  };

  if (src === 'market') {
    const p = raw?.productPrice ?? 0;
    base.priceLabel = p > 0 ? `₩ ${Number(p).toLocaleString('ko-KR')}` : '나눔🩵';
  } else if (src === 'lost') {
    base.purpose = raw?.purpose === 'found' ? 'found' : 'lost';
    base.placeLabel = raw?.place ?? '장소 정보 없음';
  } else if (src === 'group') {
    base.recruitLabel = raw?.recruitLabel ?? '';
  }

  return base;
}