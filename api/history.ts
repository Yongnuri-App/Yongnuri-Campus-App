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

// ====== 서버 DTO 타입(추정/일부 유연 매핑) ======
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
}
export interface LostItemHistoryDto {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  // 서버에 따라 'purpose' 또는 'type'으로 올 수 있음 (FOUND/LOST)
  purpose?: 'FOUND' | 'LOST';
  type?: 'FOUND' | 'LOST';
}
export interface GroupBuyHistoryDto {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  status?: 'RECRUITING' | 'COMPLETED' | 'DELETED' | string;
}

// ====== 요청 함수 ======
export async function fetchUsedItemHistory(type: 'sell' | 'buy'): Promise<UsedItemHistoryDto[]> {
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

// ====== UI 모델로 매핑 헬퍼 ======
// (현재 TradeHistoryPage가 기대하는 카드 모델 형태에 맞춰 변환)

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
};

export type MarketTradeRecord = {
  id: string;        // 고유 식별자(프론트 리스트 key)
  postId: string;    // 상세 페이지 이동용 원글 id
  title: string;
  image?: string;
  price?: number | null;
  createdAt: string;
};

export type LostPost = {
  id: string;
  title: string;
  images?: string[];
  createdAt: string;
  type: 'lost' | 'found';
  likeCount?: number;
};

export type GroupPost = {
  id: string;
  title: string;
  images?: string[];
  createdAt: string;
  likeCount?: number;
  recruit?: { mode: 'limited' | 'unlimited'; count: number | null };
};

export function mapUsedItemToMarketPost(rows: UsedItemHistoryDto[]): MarketPost[] {
  return (rows ?? []).map((r) => {
    const pid = r.postId ?? r.id;                // ✅ postId 없으면 id 사용
    const status = r.statusBadge ?? r.status ?? 'SELLING';  // ✅ status 필드명 양쪽 지원
    return {
      id: String(pid),                            // ✅ 항상 문자열 id 보장
      title: r.title,
      price: r.price ?? null,
      likeCount: r.bookmarkCount ?? 0,
      images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
      createdAt: r.createdAt,
      status,                                     // mapSaleStatus 에서 사용
      mode: 'sell',
    };
  });
}

export function mapUsedItemToTradeRecords(rows: UsedItemHistoryDto[]): MarketTradeRecord[] {
  return (rows ?? []).map((r) => {
    const pid = r.postId ?? r.id;                // ✅ postId 없으면 id 사용
    return {
      id: `${pid}__trade`,                        // 리스트 key
      postId: String(pid),                        // 상세 이동용
      title: r.title,
      image: r.thumbnailUrl ?? undefined,
      price: r.price ?? null,
      createdAt: r.createdAt,
    };
  });
}

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
    } as LostPost;
  });
}

export function mapGroupHistory(rows: GroupBuyHistoryDto[]): GroupPost[] {
  return (rows ?? []).map((r) => ({
    id: String(r.id),
    title: r.title,
    images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
    createdAt: r.createdAt,
    likeCount: 0,
    // 히스토리 응답에는 모집 정보가 없으니 기본값
    recruit: { mode: 'unlimited', count: null },
  }));
}
