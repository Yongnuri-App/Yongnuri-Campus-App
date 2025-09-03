// /src/types/chat.ts

/**
 * 채팅에서 공통으로 쓰이는 타입 정의
 * - ⚠️ ChatRoom으로 네비게이션할 때 넘기던 "기존 파라미터 형태"를 보존하기 위해
 *   ChatRoomSummary.origin 에 원본 params 를 그대로 저장할 수 있게 확장했습니다.
 */

/** 채팅 메시지 */
export type ChatMessage =
  | { id: string; type: 'text'; text: string; time: string; mine?: boolean }
  | { id: string; type: 'image'; uri: string; time: string; mine?: boolean };

/** 채팅 카테고리 (리스트 칩 필터와 연동) */
export type ChatCategory = 'market' | 'lost' | 'group';

/* ------------------------------------------------------------------ */
/*  원본 네비게이션 파라미터(Detail → ChatRoom) 보존용 타입            */
/*  - 기존에 사용하던 키 이름과 형태를 그대로 유지하기 위해 정의       */
/*  - ChatList에서 재진입 시 room.origin.params 를 그대로 사용 가능     */
/* ------------------------------------------------------------------ */

/** 중고거래에서 ChatRoom으로 갈 때 사용하던 원본 파라미터 */
export type MarketChatOriginParams = {
  source: 'market';
  postId: string;
  sellerNickname: string;
  productTitle: string;
  productPrice: number;        // 숫자(KRW), 0=나눔
  productImageUri?: string;    // 썸네일 URL
  /** 필요 시 기존에 넘기던 다른 키들이 있으면 여기에 추가 */
};

/** 분실물에서 ChatRoom으로 갈 때 사용하던 원본 파라미터 */
export type LostChatOriginParams = {
  source: 'lost';
  postId: string;
  posterNickname: string;      // 게시자 닉네임
  postTitle: string;           // 글 제목
  place: string;               // 분실/습득 장소
  purpose: 'lost' | 'found';   // 분실/습득
  postImageUri?: string;
};

/** 공동구매에서 ChatRoom으로 갈 때 사용하던 원본 파라미터
 *  - 주의: 리스트 필터 카테고리는 'group' 이지만, 원본 source 는 'groupbuy' 를 유지
 */
export type GroupbuyChatOriginParams = {
  source: 'groupbuy';
  postId: string;
  authorNickname: string;      // 작성자 닉네임
  postTitle: string;           // 글 제목
  recruitLabel: string;        // 헤더 보조 라벨(예: "현재 3명 (10명)")
  postImageUri?: string;
};

/** 원본 네비 파라미터 전체 유니온 */
export type ChatRoomOriginParams =
  | MarketChatOriginParams
  | LostChatOriginParams
  | GroupbuyChatOriginParams;

/** ChatList 재진입 시, 처음 상세에서 넘겼던 원본 파라미터를 그대로 복구하기 위해 보관 */
export type ChatRoomOrigin = {
  /** 'market' | 'lost' | 'groupbuy' (원본 그대로) */
  source: ChatRoomOriginParams['source'];
  /** 원본 params 객체(키와 형태를 그대로 유지) */
  params: ChatRoomOriginParams;
};

/* ------------------------------------------------------------------ */
/*  리스트에 쓰는 요약 타입                                             */
/* ------------------------------------------------------------------ */

/** 채팅방 요약(리스트에서 사용) */
export interface ChatRoomSummary {
  roomId: string;              // 고유 채팅방 ID
  category: ChatCategory;      // 중고거래/분실물/공동구매('group')
  nickname: string;            // 상대방 닉네임
  lastMessage: string;         // 최근 메시지(텍스트/이미지 대체문구)
  lastTs: number;              // 최근 메시지 Unix(ms)
  unreadCount: number;         // 안읽은 개수
  avatarUri?: string;          // 선택: 상대 프로필 이미지

  // 상세 연결용 메타(상세→채팅 이동 시 세팅)
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;

  /** ✅ 최초 상세 → ChatRoom 진입 시의 "원본 네비 파라미터" 보관 (재진입 복구용) */
  origin?: ChatRoomOrigin;
}

/* ------------------------------------------------------------------ */
/*  (선택) ChatRoom으로 네비게이션할 때 쓰는 최소 파라미터 타입          */
/*  - 기존 화면에서 이 타입을 사용 중이면 그대로 두세요.                 */
/*  - origin.params 를 통해 기존 확장 파라미터로도 재진입 가능합니다.    */
/* ------------------------------------------------------------------ */

export interface ChatRoomNavParams {
  roomId: string;
  category: ChatCategory;
  nickname: string;
  // 상세에서 온 경우(선택)
  productTitle?: string;
  productPrice?: number;
  productImageUri?: string;
}
