import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

/** ✅ 공용 채팅 파라미터: 중고거래(market) | 분실물(lost) | 공동구매(groupbuy) */
export type ChatRoomParams =
  | {
      source: 'market';               // 중고거래에서 진입
      postId: string;
      sellerNickname: string;
      productTitle: string;
      productPrice: number;           // 0 = 나눔
      productImageUri?: string;
      initialMessage?: string;
    }
  | {
      source: 'lost';                 // 분실물에서 진입
      postId: string;
      posterNickname: string;         // 게시자 닉네임
      postTitle: string;              // 글 제목
      place: string;                  // 분실/습득 장소
      purpose: 'lost' | 'found';      // 분실/습득 구분
      postImageUri?: string;
      initialMessage?: string;
    }
  | {
      source: 'groupbuy';             // ✅ 공동구매에서 진입
      postId: string;
      authorNickname: string;         // 작성자 닉네임
      postTitle: string;              // 글 제목
      /** 채팅 상단의 보조라벨(가격/위치 자리)에 띄울 문구 */
      recruitLabel: string;           // 예: "현재 0명 (제한 없음)" 또는 "현재 3명 (10명)"
      postImageUri?: string;          // 썸네일(첫 이미지)
      initialMessage?: string;        // 상세에서 바로 보낸 첫 메시지
    };
  

// 네비게이션 타입 정의
export type RootStackParamList = {
  Loading: undefined;
  Login: undefined;
  Signup: undefined;          // 회원가입 페이지
  PasswordReset: undefined;   // 비밀번호 재설정 페이지
  Main: { initialTab?: 'group' | 'market' | 'lost' } | undefined;            // 로그인 성공 후 메인 페이지
  Search: undefined;          // 검색 페이지
  Notification: undefined;    // 알림 페이지
  SellItem: { mode?: 'create' | 'edit'; id?: string };       // 판매 아이템 등록 페이지
  GroupBuyRecruit: { mode?: 'create' | 'edit'; id?: string }; // 공동구매 모집글 작성 페이지
  LostPost: { mode?: 'create' | 'edit'; id?: string };
  ChatList: undefined;        // 채팅 목록 페이지
  MyPage: undefined;
  MyPersonalInfo: undefined;
  MyFavorites: undefined;
  MyBlockedUsers: undefined;
  MyTradeHistory: undefined;
  MyInquiry: undefined;
  MyWithdraw: undefined;

  // 상세 페이지들
  MarketDetail: { id: string; isOwner?: boolean };
  LostDetail: { id: string; isOwner?: boolean };
  GroupBuyDetail: { id: string; isOwner?: boolean };

  // ✅ 신고하기 페이지 (타겟 라벨은 선택)
  Report: { targetLabel?: string };

  // ✅ 공용 채팅방: 중고/분실 모두 이 타입으로 진입
  ChatRoom: ChatRoomParams;
};

/** 화면 컴포넌트에서 사용할 공용 Props 타입 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/** useNavigation에서 쓸 내비게이션 타입(선택) */
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
