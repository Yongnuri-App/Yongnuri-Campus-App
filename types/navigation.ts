import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

// 네비게이션 타입 정의
export type RootStackParamList = {
  Loading: undefined;
  Login: undefined;
  Signup: undefined;          // 회원가입 페이지
  PasswordReset: undefined;   // 비밀번호 재설정 페이지
  Main: undefined;            // 로그인 성공 후 메인 페이지
  Search: undefined;          // 검색 페이지
  Notification: undefined;    // 알림 페이지
  SellItem: undefined;        // 판매 아이템 등록 페이지
  GroupBuyRecruit: undefined; // 공동구매 모집글 작성 페이지
  LostPost: undefined;
  ChatList: undefined;        // 채팅 목록 페이지

  // 상세 페이지들
  MarketDetail: { id: string; isOwner?: boolean };
  LostDetail: { id: string };
  GroupBuyDetail: { id: string };

  // ✅ 신고하기 페이지 (타겟 라벨은 선택)
  Report: { targetLabel?: string };
};

/** 화면 컴포넌트에서 사용할 공용 Props 타입 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/** useNavigation에서 쓸 내비게이션 타입(선택) */
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
