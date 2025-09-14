import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

/** ✅ 공통 메타: 작성자 판별/판매상태 초기값 */
type OwnerMeta = {
  /** 작성자(판매자) 식별값 — usePermissions가 AsyncStorage('auth_user_id')와 비교 */
  authorId?: string | number;
  /** 이메일 매칭도 허용 */
  authorEmail?: string | null;
  /** 라우트 힌트(선택): true면 무조건 소유자로 처리(개발/특수 케이스) */
  isOwner?: boolean;
};

type SaleStatusApi = 'ON_SALE' | 'RESERVED' | 'SOLD';

type MarketMeta = {
  /** 중고거래 전용: 판매상태 초기값(API enum) */
  initialSaleStatus?: SaleStatusApi;
};

/** ✅ 공용 채팅 파라미터: 중고거래(market) | 분실물(lost) | 공동구매(groupbuy) | 공지사항(notice) */
export type ChatRoomParams =
  | ({
      source: 'market';
      postId: string;
      sellerNickname: string;
      productTitle: string;
      productPrice: number;           // 0 = 나눔
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
      /** 채팅 상단 보조라벨(가격/위치 자리)에 띄울 문구 */
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
  Main: { initialTab?: 'group' | 'market' | 'lost'; isAdmin?: boolean } | undefined;
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
  AdminGate: undefined; // ✅ 루트 스택엔 게이트만 등록
  AdminNoticeCreate: undefined; // 기존 경로 유지
  NoticeWrite: { mode: 'create' | 'edit'; id?: string } | undefined; // ✅ 별칭 라우트(수정/작성 공용)

  // 상세 페이지들
  MarketDetail: { id: string; isOwner?: boolean };
  LostDetail: { id: string; isOwner?: boolean };
  GroupBuyDetail: { id: string; isOwner?: boolean };
  NoticeDetail: { id: string; isAdmin?: boolean };

  Report: { targetLabel?: string };

  // ✅ 공용 채팅방: 중고/분실/공동구매/공지 모두 이 타입으로 진입
  ChatRoom: ChatRoomParams;
};

// ✅ Admin 전용 스택 타입 (AdminGate 내부에서만 사용)
export type AdminStackParamList = {
  AdminPage: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
