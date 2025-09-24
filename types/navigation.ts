// types/navigation.ts
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

/** ✅ 공용 채팅 파라미터 */
export type ChatRoomParams =
  | ({
      source: 'market';
      postId: string;
      sellerNickname: string;
      productTitle: string;
      productPrice: number;
      productImageUri?: string;
      initialMessage?: string;
    } & OwnerMeta &
      MarketMeta)
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

  // 채팅방
  ChatRoom: ChatRoomParams;

  // ✅ 관리자
  AdminInquiryNotice: undefined;
  AdminMemberList: undefined;
  AdminReportManage: undefined;

  // ✅ 추가: 전체 공지 목록 / 등록
  AdminAllNotice: undefined;
  AdminAllNoticeCreate: undefined; // << 추가
};

export type RootStackScreenProps<
  T extends keyof RootStackParamList,
> = NativeStackScreenProps<RootStackParamList, T>;

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
