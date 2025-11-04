// /api/history.ts
// -------------------------------------------------------------------
// 거래내역(중고/분실물/공동구매) 조회용 백엔드 API 래퍼
// 백엔드 엔드포인트 (HistoryController):
//   - GET /history/used-items?type=sell|buy
//   - GET /history/lost-items?filter=found|lost|returned
//   - GET /history/group-buys?filter=registered|applied
// 응답 DTO → 현재 UI 카드 모델(MarketPost, MarketTradeRecord, LostPost, GroupPost)로 매핑
// -------------------------------------------------------------------

import { api } from './client';

/* -------------------------------------------------------------------
 * 서버 DTO 타입
 *  - 위치 필드는 단일 키(location: string|null)만 사용합니다.
 * ------------------------------------------------------------------- */
export interface UsedItemHistoryDto {
  id?: number;
  postId: number;
  title: string;
  thumbnailUrl?: string | null;
  price?: number | null;
  statusBadge?: 'SELLING' | 'RESERVED' | 'SOLD' | 'DELETED' | string;
  status?: 'SELLING' | 'RESERVED' | 'SOLD' | 'DELETED' | string;
  createdAt: string;
  bookmarkCount?: number;

  /** ✅ 위치 문자열 (예: "체육과학대학") */
  location?: string | null;
}

export interface LostItemHistoryDto {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  // 서버에 따라 'purpose' 또는 'type'으로 올 수 있음 (FOUND/LOST)
  purpose?: 'FOUND' | 'LOST';
  type?: 'FOUND' | 'LOST';

  /** ✅ 위치 문자열 (예: "무도대학") — 분실물도 동일 키로 통일 */
  location?: string | null;
}

export interface GroupBuyHistoryDto {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  status?: 'RECRUITING' | 'COMPLETED' | 'DELETED' | string;
  limit?: number | null;
  currentCount?: number | null;
}

/* -------------------------------------------------------------------
 * 요청 함수
 * ------------------------------------------------------------------- */
export async function fetchUsedItemHistory(
  type: 'sell' | 'buy'
): Promise<UsedItemHistoryDto[]> {
  const { data } = await api.get<UsedItemHistoryDto[]>('/history/used-items', { params: { type } });
  return data ?? [];
}

export async function fetchLostItemHistory(
  filter: 'found' | 'lost' | 'returned',
): Promise<LostItemHistoryDto[]> {
  const { data } = await api.get<LostItemHistoryDto[]>('/history/lost-items', { params: { filter } });
  return data ?? [];
}

export async function fetchGroupBuyHistory(
  filter: 'registered' | 'applied',
): Promise<GroupBuyHistoryDto[]> {
  const { data } = await api.get<GroupBuyHistoryDto[]>('/history/group-buys', { params: { filter } });
  return data ?? [];
}

/* -------------------------------------------------------------------
 * UI 모델 타입
 *  - TradeHistoryPage에서 subtitle 조합용으로 locationLabel을 제공
 * ------------------------------------------------------------------- */
export type MarketPost = {
  id: string;
  title: string;
  price?: number | null;
  likeCount?: number;
  images?: string[];
  createdAt: string;
  // 상태 표기를 위해 임시 필드
  status?: 'SELLING' | 'RESERVED' | 'SOLD' | 'DELETED' | string;
  mode?: 'sell' | 'donate';

  /** ✅ subtitle에 붙일 위치 라벨 (예: "체육과학대학") */
  locationLabel?: string;
};

export type MarketTradeRecord = {
  id: string;        // 고유 식별자(프론트 리스트 key)
  postId: string;    // 상세 페이지 이동용 원글 id
  title: string;
  image?: string;
  price?: number | null;
  createdAt: string;
  mode?: 'sell' | 'donate'; 

  /** ✅ 거래완료 카드에서도 동일하게 위치 사용 */
  locationLabel?: string;
};

export type LostPost = {
  id: string;
  title: string;
  images?: string[];
  createdAt: string;
  type: 'lost' | 'found';
  likeCount?: number;

  /** ✅ 분실물 카드 위치 라벨 */
  locationLabel?: string;
};

export type GroupPost = {
  id: string;
  title: string;
  images?: string[];
  createdAt: string;
  likeCount?: number;
  recruit?: { mode: 'limited' | 'unlimited'; count: number | null };
};

/* -------------------------------------------------------------------
 * 매핑 함수
 *  - 서버의 location(string|null) → locationLabel로 그대로 연결
 *  - subtitle은 각 페이지에서 "장소 · 시간" 형식으로 조합
 * ------------------------------------------------------------------- */

/** 중고거래: 내가 올린 글(판매) 카드 모델 */
export function mapUsedItemToMarketPost(rows: UsedItemHistoryDto[]): MarketPost[] {
  return (rows ?? []).map((r) => {
    const pid = r.postId ?? r.id;                            // postId 우선, 없으면 id
    const status = r.statusBadge ?? r.status ?? 'SELLING';   // 상태 키 양쪽 지원
    return {
      id: String(pid),
      title: r.title,
      price: r.price ?? null,
      likeCount: r.bookmarkCount ?? 0,
      images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
      createdAt: r.createdAt,
      status,
      mode: (r.price === 0 || r.price === null) ? 'donate' : 'sell',
      locationLabel: r.location ?? undefined,                // ✅ 핵심: 단일 키만 사용
    };
  });
}

/** 중고거래: 내가 구매한 거래완료 스냅샷 카드 모델 */
export function mapUsedItemToTradeRecords(rows: UsedItemHistoryDto[]): MarketTradeRecord[] {
  return (rows ?? []).map((r) => {
    const pid = r.postId ?? r.id;
    return {
      id: `${pid}__trade`,
      postId: String(pid),
      title: r.title,
      image: r.thumbnailUrl ?? undefined,
      price: r.price ?? null,
      mode: (r.price === 0 || r.price === null) ? 'donate' : 'sell',
      createdAt: r.createdAt,
      locationLabel: r.location ?? undefined,                // ✅ 동일
    };
  });
}

/** 분실물: 분실/습득 카드 모델 */
export function mapLostHistory(rows: LostItemHistoryDto[]): LostPost[] {
  return (rows ?? []).map((r) => {
    const purpose = (r.purpose ?? r.type ?? 'LOST').toUpperCase();
    return {
      id: String(r.id),
      title: r.title,
      images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
      createdAt: r.createdAt,
      // 서버는 FOUND/LOST, 프론트는 found/lost
      type: purpose === 'FOUND' ? 'found' : 'lost',
      likeCount: 0,
      locationLabel: r.location ?? undefined,                // ✅ 동일
    };
  });
}

/** 공동구매: 등록/신청 카드 모델 */
export function mapGroupHistory(rows: GroupBuyHistoryDto[]): GroupPost[] {
  return (rows ?? []).map((r) => {
    const limit = r.limit ?? null;
    const mode: 'limited' | 'unlimited' =
      limit != null && Number(limit) > 0 ? 'limited' : 'unlimited';

    return {
      id: String(r.id),
      title: r.title,
      images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
      createdAt: r.createdAt,
      likeCount: 0,
      /** ✅ 모집 제한 반영 */
      recruit: { mode, count: limit },
    };
  });
}
