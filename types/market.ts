// types/market.ts
export type MarketMethod = 'SELL' | 'DONATE';

// 서버 추정 enum (실제와 다르면 여기만 바꾸면 됨)
export type MarketStatus = 'SELLING' | 'RESERVED' | 'SOLD_OUT';

export type CreateMarketPostReq = {
  title: string;
  content: string;
  imageUrls: string[];
  method: MarketMethod;
  location: string;
  price: number;
  status: MarketStatus; // ✅ 필수로 변경 (서버 NotBlank 대응)
};

export type CreateMarketPostRes = {
  post_id: string | number;
};
