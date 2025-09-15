import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

/** ✅ 공통 메타: 작성자 판별/판매상태 초기값 */
type OwnerMeta = {
  authorId?: string | number;
  authorEmail?: string | null;
  isOwner?: boolean;
};

type SaleStatusApi = 'ON_SALE' | 'RESERVED' | 'SOLD';

type MarketMeta = {
  initialSaleStatus?: SaleStatusApi;
};

/** ✅ 공용 채팅 파라미터: 중고거래(market) | 분실물(lost) | 공동구매(groupbuy) */
export type ChatRoomParams =
  | ({
      source: 'market';
      postId: string;
      sellerNickname: string;
      productTitle: string;
      productPrice: number;
      productImageUri?: string;
      initialMessage?: string;
    } & OwnerMeta & MarketMeta)
  | ({
      source: 'lost';
      postId: string;
      posterNickname: string;
      postTitle: string;
      place: string;
      purpose: 'lost' | 'found';
      postImageUri?: string;
      initialMessage?: string;
    } & OwnerMeta)
  | ({
      source: 'groupbuy';
      postId: string;
      authorNickname: string;
      postTitle: string;
      recruitLabel: string;
      postImageUri?: string;
      initialMessage?: string;
    } & OwnerMeta);

// 네비게이션 타입 정의
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

  // 마켓 / 공동구매 / 분실물
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

  // 관리자 게이트/공지 작성
  AdminGate: undefined;
  AdminNoticeCreate: undefined;
  NoticeWrite: { mode: 'create' | 'edit'; id?: string } | undefined;

  // 상세 페이지들
  MarketDetail: { id: string; isOwner?: boolean };
  LostDetail: { id: string; isOwner?: boolean };
  GroupBuyDetail: { id: string; isOwner?: boolean };
  NoticeDetail: { id: string; isAdmin?: boolean };

  Report: { targetLabel?: string };

  // ✅ 공용 채팅방
  ChatRoom: ChatRoomParams;

  // ✅ 관리자: 문의하기 공지 설정
  AdminInquiryNotice: undefined;

  // ✅ 관리자: 회원 정보 목록 (새로 추가)
  AdminMemberList: undefined;
};

// ✅ Admin 전용 스택 타입 (AdminGate 내부에서만 사용하고 싶다면)
export type AdminStackParamList = {
  AdminPage: undefined;
  AdminMemberList: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
