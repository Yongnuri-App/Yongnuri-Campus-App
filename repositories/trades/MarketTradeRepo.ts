// repositories/trades/MarketTradeRepo.ts
// -------------------------------------------------------
// ✅ '거래완료' 시점의 스냅샷을 저장/조회하는 로컬 저장소 (AsyncStorage)
// - 구매자 마이페이지 "중고거래/구매" 탭은 이 저장소에서 조회
// - 판매자 입장에서도 "판매 완료 목록" 조회 용도로 확장 가능
// - 백엔드 연결 전 로컬 캐시용. API 연동 시 내부 구현만 교체하면 동일 인터페이스로 사용 가능
// -------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'market_trades_v1';

// 거래 완료 스냅샷 구조 (필요 시 필드 확장)
export type MarketTradeRecord = {
  id: string;                // trade-id (postId + buyerEmail 타임스탬프 등으로 생성)
  postId: string;
  title: string;
  price?: number;
  image?: string;
  saleStatus: '거래완료';     // 고정
  sellerEmail?: string | null;
  sellerId?: string | null;
  buyerEmail?: string | null;
  buyerId?: string | null;
  createdAt: string;         // 거래 완료 시각
  postCreatedAt?: string;    // 원글 작성 시각(정렬 보조)
};

async function readAll(): Promise<MarketTradeRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as MarketTradeRecord[]; } catch { return []; }
}

async function writeAll(list: MarketTradeRecord[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function makeId(postId: string, buyerKey: string) {
  // ⚠️ 동일 postId에 대해 여러 번 거래완료를 기록하지 않도록, postId+buyer 기준으로 유니크 키 생성
  return `${postId}__${buyerKey}`;
}

export default {
  // ✅ 거래 완료 기록 추가(업서트)
  // - 같은 (postId, buyer) 조합이 이미 있으면 갱신
  async upsert(record: Omit<MarketTradeRecord, 'id' | 'saleStatus' | 'createdAt'> & { createdAt?: string }) {
    const now = record.createdAt ?? new Date().toISOString();
    const buyerKey = (record.buyerEmail ?? record.buyerId ?? '').toString().trim().toLowerCase();
    const id = makeId(record.postId, buyerKey);

    const all = await readAll();
    const idx = all.findIndex(r => r.id === id);

    const next: MarketTradeRecord = {
      id,
      postId: record.postId,
      title: record.title,
      price: record.price,
      image: record.image,
      saleStatus: '거래완료',
      sellerEmail: record.sellerEmail ?? null,
      sellerId: record.sellerId ?? null,
      buyerEmail: record.buyerEmail ?? null,
      buyerId: record.buyerId ?? null,
      createdAt: now,
      postCreatedAt: record.postCreatedAt,
    };

    if (idx >= 0) all[idx] = next; else all.push(next);
    // 최근 거래 먼저 보이도록 정렬(거래완료 시각 기준 ↓)
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    await writeAll(all);
    return next;
  },

  // ✅ 구매자 이메일/ID로 조회
  async listByBuyer({ buyerEmail, buyerId }: { buyerEmail?: string | null; buyerId?: string | null; }): Promise<MarketTradeRecord[]> {
    const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const all = await readAll();
    const be = norm(buyerEmail);
    const bi = (buyerId ?? '').toString();
    return all.filter(r => (be && norm(r.buyerEmail) === be) || (bi && (r.buyerId ?? '') === bi));
  },

  // ✅ 판매자 이메일/ID로 조회 (확장용)
  async listBySeller({ sellerEmail, sellerId }: { sellerEmail?: string | null; sellerId?: string | null; }) {
    const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const all = await readAll();
    const se = norm(sellerEmail);
    const si = (sellerId ?? '').toString();
    return all.filter(r => (se && norm(r.sellerEmail) === se) || (si && (r.sellerId ?? '') === si));
  },

  // (선택) 전체 삭제/정리 유틸
  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
