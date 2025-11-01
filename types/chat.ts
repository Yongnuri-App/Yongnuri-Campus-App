/**
 * 채팅 공통 타입
 * - senderEmail/senderId로 발신자 식별
 * - system 메시지 지원
 * - mine? 는 레거시 호환용(가능하면 런타임 계산)
 */

export type ChatMessageBase = {
  id: string;
  time: string;                // ISO

  /** 보낸 사람 메타 */
  senderEmail?: string | null;
  senderId?: string | null;

  /** (레거시) UI 힌트 */
  mine?: boolean;
};

export type ChatMessage =
  | (ChatMessageBase & { type: 'text'; text: string })
  | (ChatMessageBase & { type: 'image'; uri: string })
  | (ChatMessageBase & { type: 'system'; text: string });

export type ChatCategory = 'market' | 'lost' | 'group';
export type SaleStatusApi = 'ON_SALE' | 'RESERVED' | 'SOLD';

/* ---------------------- 원본 네비 파라미터 ---------------------- */

export type MarketChatOriginParams = {
  source: 'market';
  postId: string;
  sellerNickname: string;
  productTitle: string;
  productPrice: number;
  productImageUri?: string;

  authorId?: string | number;
  authorEmail?: string | null;
  initialSaleStatus?: SaleStatusApi;
  initialMessage?: string;
};

export type LostChatOriginParams = {
  source: 'lost';
  postId: string;
  posterNickname: string;
  postTitle: string;
  place: string;
  purpose: 'lost' | 'found';
  postImageUri?: string;
};

export type GroupbuyChatOriginParams = {
  source: 'groupbuy';
  postId: string;
  authorNickname: string;
  postTitle: string;
  recruitLabel: string;
  postImageUri?: string;
};

export type ChatRoomOriginParams =
  | MarketChatOriginParams
  | LostChatOriginParams
  | GroupbuyChatOriginParams;

export type ChatRoomOrigin = {
  source: ChatRoomOriginParams['source']; // 'market' | 'lost' | 'groupbuy'
  params: ChatRoomOriginParams;
};

/* -------------------------- 리스트 요약 -------------------------- */

export interface ChatRoomSummary {
  roomId: string;
  category: ChatCategory;
  nickname: string;
  lastMessage: string;
  lastTs: number;
  unreadCount: number;
  avatarUri?: string;

  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;

  origin?: ChatRoomOrigin;

  sellerId?: string | number | null;
  sellerEmail?: string | null;
  saleStatus?: SaleStatusApi;

  place?: string;
  purpose?: 'lost' | 'found';
  recruitLabel?: string;
}

/* --------------------- 네비 최소 파라미터(선택) --------------------- */

export interface ChatRoomNavParams {
  roomId: string;
  category: ChatCategory;
  nickname: string;
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
}
