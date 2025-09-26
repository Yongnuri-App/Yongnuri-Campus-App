// types/navigation.ts
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

/** -----------------------------------------------------------
 * 공통 메타: 작성자 판별/판매상태 초기값 등
 * ---------------------------------------------------------*/
type OwnerMeta = {
  /** 게시글 작성자(판매자) 식별 - 클라이언트 로컬 기준 */
  authorId?: string | number;
  authorEmail?: string | null;
  /** 현재 로그인 사용자가 작성자인지 여부(빠른 분기용) */
  isOwner?: boolean;
};

export type SaleStatusApi = 'ON_SALE' | 'RESERVED' | 'SOLD';
export type LostStatusApi = 'OPEN' | 'RESOLVED';

type MarketMeta = {
  /** 상세/채팅 진입 시점의 초기 판매상태(있으면 헤더/셀렉터 초기값에 사용) */
  initialSaleStatus?: SaleStatusApi;
};

// /** -----------------------------------------------------------
//  * 공통: 채팅 상대/참여자/카드 공용 필드
//  * - opponent*: "현재 로그인 사용자 기준의 상대" (매우 중요)
//  * - buyer*/seller*: 거래 스냅샷 기록 시 사용
//  * - roomId: 동일 조합이면 항상 동일하게 생성된 값을 권장
//  * - postCreatedAt: (선택) 정렬 보조나 스냅샷 기록에 사용
//  * ---------------------------------------------------------*/
type ChatCommonMeta = {
  /** 채팅방 고유 ID (없으면 내부에서 deriveRoomIdFromParams로 보강) */
  roomId?: string;

  /** (선택) 게시글 생성 시각 */
  postCreatedAt?: string;

  /** 초기 메시지 (처음 입장 시 자동 전송 등) */
  initialMessage?: string;

  /** ✅ 현재 로그인 사용자 기준의 '상대' 정보 — 반드시 하나 이상(opponentEmail 또는 opponentId)을 채워줄 것 */
  opponentId?: string;
  opponentEmail?: string;
  opponentNickname?: string;
  opponentDept?: string;
  opponentAvatarUri?: string;

  /** 거래 스냅샷 기록/헤더 표시용 메타 (가능하면 채워주기) */
  sellerId?: string;
  sellerEmail?: string;
  sellerNickname?: string;

  buyerId?: string;
  buyerEmail?: string;
  buyerNickname?: string;
};

/** -----------------------------------------------------------
 * 공용 채팅 파라미터 (화면별 카드 헤더 정보를 포함)
 * ---------------------------------------------------------*/
export type ChatRoomParams =
  | ({
      /** 출처: 중고거래 */
      source: 'market';
      /** 게시글 ID */
      postId: string;

      /** 상단 카드용 정보 */
      productTitle: string;
      productPrice: number;
      productImageUri?: string;

      /** (선택) 초기 판매 상태 */
      initialSaleStatus?: SaleStatusApi;
    } & OwnerMeta &
      ChatCommonMeta)
  | ({
      /** 출처: 분실물 */
      source: 'lost';
      postId: string;

      /** 상단 카드용 정보 */
      posterNickname: string;
      postTitle: string;
      place: string;
      purpose: 'lost' | 'found';
      postImageUri?: string;

      /** (선택) 초기 분실물 상태 */
      initialLostStatus?: LostStatusApi;
    } & OwnerMeta &
      ChatCommonMeta)
  | ({
      /** 출처: 공동구매 */
      source: 'groupbuy';
      postId: string;

      /** 상단 카드용 정보 */
      authorNickname: string;
      postTitle: string;
      recruitLabel: string;
      postImageUri?: string;
    } & OwnerMeta &
      ChatCommonMeta);

/** -----------------------------------------------------------
 * 네비게이션 스택 파라미터 (기존 라우트 유지)
 * ---------------------------------------------------------*/
export type RootStackParamList = {
  Loading: undefined;
  Login: undefined;
  Signup: undefined;
  PasswordReset: undefined;
  Main:
    | { initialTab?: 'group' | 'market' | 'lost'; isAdmin?: boolean }
    | undefined;
  Search: undefined;
  Notification: undefined;

  // 작성/수정
  SellItem: { mode?: 'create' | 'edit'; id?: string };
  GroupBuyRecruit: { mode?: 'create' | 'edit'; id?: string };
  LostPost: { mode?: 'create' | 'edit'; id?: string };

  // 채팅/리스트
  ChatList: undefined;

  // 마이
  MyPage: undefined;
  MyPersonalInfo: undefined;
  MyFavorites: undefined;
  MyBlockedUsers: undefined;
  MyTradeHistory: undefined;
  MyInquiry: undefined;
  MyWithdraw: undefined;

  // 관리자/공지
  AdminGate: undefined;
  AdminNoticeCreate: undefined;
  NoticeWrite: { mode: 'create' | 'edit'; id?: string } | undefined;

  // 상세
  MarketDetail: { id: string; isOwner?: boolean };
  LostDetail: { id: string; isOwner?: boolean };
  GroupBuyDetail: { id: string; isOwner?: boolean };
  NoticeDetail: { id: string; isAdmin?: boolean };

  // ✅ 신고하기
  Report:
    | {
        mode?: 'compose';
        targetLabel?: string;
        targetNickname?: string;
        targetDept?: string;
        targetEmail?: string | null;

        // ✅ 추가: 삭제/알림에 꼭 필요한 메타
        targetPostId?: string;                // 글 ID
        targetStorageKey?: string;            // 저장소 키 (예: 'market_posts_v1')
        targetPostTitle?: string;             // 글 제목 (알림 문구용)
        targetKind?: 'market' | 'lost' | 'groupbuy' | 'notice'; // 힌트
      }
    | {
        mode: 'review';
        reportId: string;
      };

  // ✅ 채팅방 (업데이트된 파라미터)
  ChatRoom: ChatRoomParams;

  // ✅ 관리자
  AdminInquiryNotice: undefined;
  AdminMemberList: undefined;
  AdminReportManage: undefined;

  // ✅ 추가: 전체 공지 목록 / 등록
  AdminAllNotice: undefined;
  AdminAllNoticeCreate: undefined;
};

/** 편의 타입들 */
export type RootStackScreenProps<
  T extends keyof RootStackParamList,
> = NativeStackScreenProps<RootStackParamList, T>;

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
