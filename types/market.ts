export type MarketMethod = 'SELL' | 'DONATE';

/** 서버 Enum(UsedItemStatus)과 동일하게 통일 */
export type MarketStatus = 'SELLING' | 'RESERVED' | 'SOLD';

/** 과거 값 호환용: SOLD_OUT → SOLD */
export const normalizeToServerStatus = (s: string): MarketStatus => {
  if (s === 'SOLD_OUT') return 'SOLD';
  if (s === 'RESERVED') return 'RESERVED';
  if (s === 'SELLING') return 'SELLING';
  // 모르는 값은 안전하게 SELLING
  return 'SELLING';
};

export type CreateMarketPostReq = {
  title: string;
  content: string;
  imageUrls: string[];
  method: MarketMethod;
  location: string;
  price: number;
  status: MarketStatus; // ✅ 서버 NotBlank 대응
};

export type CreateMarketPostRes = {
  post_id: string | number;
};