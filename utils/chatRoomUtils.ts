// utils/chatRoomUtils.ts
import type { SaleStatusLabel } from '@/components/Chat/SaleStatusSelector/SaleStatusSelector';

type ApiSaleStatus = 'ON_SALE' | 'RESERVED' | 'SOLD';
type ChatTypeEnum = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY';

export function toSaleStatusLabel(s?: ApiSaleStatus): SaleStatusLabel {
  switch (s) {
    case 'RESERVED': return '예약중';
    case 'SOLD': return '거래완료';
    case 'ON_SALE':
    default: return '판매중';
  }
}

export function mapSourceToChatType(source?: string): ChatTypeEnum {
  switch ((source ?? '').toLowerCase()) {
    case 'lost': return 'LOST_ITEM';
    case 'groupbuy': return 'GROUP_BUY';
    default: return 'USED_ITEM';
  }
}

export function toNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
}

export function enrichWithBuyer(p: any, myEmail: string | null, myId: string | null) {
  const toStr = (v: unknown) => (v == null ? undefined : String(v));
  return {
    ...p,
    buyerEmail: p?.buyerEmail ?? p?.userEmail ?? toStr(myEmail),
    buyerId: toStr(p?.buyerId ?? p?.userId ?? myId),
    userEmail: p?.userEmail ?? toStr(myEmail),
    userId: p?.userId ?? toStr(myId),
  };
}

export function pickOtherNickname(opts: {
  meEmail?: string | null;
  meId?: string | null;
  isOwner: boolean;
  sellerEmail?: string;
  buyerEmail?: string;
  sellerId?: string | number;
  buyerId?: string | number;
  sellerName?: string;
  buyerName?: string;
  opponentNickname?: string;
}): string {
  const toL = (v?: string | null) => (v ?? '').trim().toLowerCase();
  const toS = (v?: string | number) => (v == null ? '' : String(v));
  const {
    meEmail, meId, isOwner,
    sellerEmail, buyerEmail, sellerId, buyerId,
    sellerName, buyerName, opponentNickname,
  } = opts;

  const amSeller =
    isOwner ||
    (!!meEmail && !!sellerEmail && toL(meEmail) === toL(sellerEmail)) ||
    (!!meId && !!sellerId && toS(meId) === toS(sellerId));
  const amBuyer =
    (!!meEmail && !!buyerEmail && toL(meEmail) === toL(buyerEmail)) ||
    (!!meId && !!buyerId && toS(meId) === toS(buyerId));

  if (amSeller) return buyerName || opponentNickname || '상대방';
  if (amBuyer) return sellerName || opponentNickname || '상대방';
  if (sellerName && sellerName !== buyerName) return sellerName;
  return buyerName || opponentNickname || '상대방';
}