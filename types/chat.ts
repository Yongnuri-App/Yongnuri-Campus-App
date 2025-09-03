// /src/types/chat.ts

/** 채팅 메시지 */
export type ChatMessage =
  | { id: string; type: 'text'; text: string; time: string; mine?: boolean }
  | { id: string; type: 'image'; uri: string; time: string; mine?: boolean };

/** 채팅 카테고리 (리스트 칩 필터와 연동) */
export type ChatCategory = 'market' | 'lost' | 'group';

/** 채팅방 요약(리스트에서 사용) */
export interface ChatRoomSummary {
  roomId: string;              // 고유 채팅방 ID
  category: ChatCategory;      // 중고거래/분실물/공동구매
  nickname: string;            // 상대방 닉네임
  lastMessage: string;         // 최근 메시지(텍스트/이미지 대체문구)
  lastTs: number;              // 최근 메시지 Unix(ms)
  unreadCount: number;         // 안읽은 개수
  avatarUri?: string;          // 선택: 상대 프로필 이미지
  // 상세 연결용 메타(상세→채팅 이동 시 세팅)
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
}

/** ChatRoomPage로 네비게이션할 때 넘기는 파라미터 */
export interface ChatRoomNavParams {
  roomId: string;
  category: ChatCategory;
  nickname: string;
  // 상세에서 온 경우(선택)
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
}
