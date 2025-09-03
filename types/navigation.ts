import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

// 기존 RootStackParamList (네가 올린 내용 유지)
export type RootStackParamList = {
  Loading: undefined;
  Login: undefined;
  Signup: undefined;
  PasswordReset: undefined;
  Main: { initialTab?: 'group' | 'market' | 'lost'; isAdmin?: boolean } | undefined;
  Search: undefined;
  Notification: undefined;
  SellItem: { mode?: 'create' | 'edit'; id?: string };
  GroupBuyRecruit: { mode?: 'create' | 'edit'; id?: string };
  LostPost: { mode?: 'create' | 'edit'; id?: string };
  ChatList: undefined;
  MyPage: undefined;
  MyPersonalInfo: undefined;
  MyFavorites: undefined;
  MyBlockedUsers: undefined;
  MyTradeHistory: undefined;
  MyInquiry: undefined;
  MyWithdraw: undefined;
  AdminGate: undefined; // ✅ 루트 스택엔 게이트만 등록
  MarketDetail: { id: string; isOwner?: boolean };
  LostDetail: { id: string; isOwner?: boolean };
  GroupBuyDetail: { id: string; isOwner?: boolean };
  Report: { targetLabel?: string };
  ChatRoom: {
    postId: string;
    sellerNickname: string;
    productTitle: string;
    productPrice: number;
    productImageUri?: string;
    initialMessage?: string;
  };
};

// ✅ Admin 전용 스택 타입 (AdminGate 내부에서만 사용)
export type AdminStackParamList = {
  AdminPage: undefined;
  
  
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
