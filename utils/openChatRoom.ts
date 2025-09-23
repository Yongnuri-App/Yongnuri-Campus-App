// utils/openChatRoom.ts
// ----------------------------------------------------------
// 공용 "채팅방 열기" 헬퍼
// - 항상 opponent 정보(opponentEmail 또는 opponentId)를 채워서 ChatRoom으로 이동
// - roomId를 seller/buyer/post 조합으로 안정적으로 생성
// - productTitle(문자열)/productPrice(숫자)는 undefined 방지 보정
// ----------------------------------------------------------
import type { RootStackParamList } from '@/types/navigation';
import { getLocalIdentity } from '@/utils/localIdentity';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** 네비 타입 */
type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 최소 게시글/유저 메타 (실사용에서 일부가 비어있을 수 있어 optional) */
type MinimalPost = {
  id: string;                  // ✅ 필수
  title?: string;              // ⛳️ optional → 보정 필요
  image?: string | null;
  price?: number;              // ⛳️ optional → 보정 필요
  createdAt?: string;
  authorId?: string | number | null;
  authorEmail?: string | null;
  authorNickname?: string | null;
};

type MinimalUser = {
  id?: string | number | null;
  email?: string | null;
  nickname?: string | null;
  dept?: string | null;
  avatarUri?: string | null;
};

/** 내부 공통: 문자열/숫자 보정 */
const normStr = (v: unknown, fallback = ''): string =>
  (typeof v === 'string' && v.trim().length > 0 ? v : String(v ?? fallback));

const ensureTitle = (t?: string) => (t && t.trim().length > 0 ? t : '제목 없음');
const ensurePrice = (p?: number) => (typeof p === 'number' && Number.isFinite(p) ? p : 0);

/** roomId: post + sellerKey + buyerKey 조합(이메일 우선 → 없으면 id) */
const keyLike = (u?: MinimalUser | null) => {
  const src = u?.email ?? u?.id ?? '';
  return String(src).trim().toLowerCase();
};
export function buildMarketRoomId(postId: string, seller: MinimalUser, buyer: MinimalUser) {
  return `m_${postId}__s_${keyLike(seller)}__b_${keyLike(buyer)}`;
}

/**
 * 구매자 플로우: 상품 상세에서 "채팅하기"
 * - opponent=판매자
 * - buyer=현재 로그인 사용자
 */
export async function openChatAsBuyer(
  navigation: Nav,
  args: {
    post: MinimalPost;
    seller: MinimalUser;
    initialMessage?: string;
    initialSaleStatus?: 'ON_SALE' | 'RESERVED' | 'SOLD';
  }
) {
  // 현재 로그인 사용자 = 구매자
  const { userEmail, userId } = await getLocalIdentity();
  const buyer: MinimalUser = { email: userEmail ?? null, id: userId ?? null };

  // 필수 파라미터 보정
  const productTitle = ensureTitle(args.post.title);
  const productPrice = ensurePrice(args.post.price);
  const productImageUri = args.post.image ?? undefined;

  // roomId는 post + seller + buyer 조합
  const roomId = buildMarketRoomId(args.post.id, args.seller, buyer);

  navigation.navigate('ChatRoom', {
    source: 'market',
    roomId,
    postId: args.post.id,
    productTitle,                  // ✅ string 보장
    productPrice,                  // ✅ number 보장
    productImageUri,
    postCreatedAt: args.post.createdAt,

    // 판매자 정보
    sellerId: args.seller.id != null ? String(args.seller.id) : undefined,
    sellerEmail: args.seller.email ?? undefined,
    sellerNickname: args.seller.nickname ?? undefined,

    // 구매자 정보(현재 로그인 사용자)
    buyerId: buyer.id != null ? String(buyer.id) : undefined,
    buyerEmail: buyer.email ?? undefined,
    buyerNickname: undefined,

    // ✅ opponent=판매자 (현재 로그인 사용자의 상대)
    opponentId: args.seller.id != null ? String(args.seller.id) : undefined,
    opponentEmail: args.seller.email ?? undefined,
    opponentNickname: args.seller.nickname ?? undefined,
    opponentDept: args.seller.dept ?? undefined,
    opponentAvatarUri: args.seller.avatarUri ?? undefined,

    initialMessage: args.initialMessage,
    initialSaleStatus: args.initialSaleStatus,
  });
}

/**
 * 판매자 플로우: 판매자 화면에서 특정 구매자와 대화 열기
 * - opponent=구매자  ✅ (판매자 단말에서 거래완료 저장을 위해 중요)
 * - seller=현재 로그인 사용자(또는 post.author)
 * - buyer=인자로 받은 사용자
 */
export async function openChatAsSellerWithBuyer(
  navigation: Nav,
  args: {
    post: MinimalPost;
    buyer: MinimalUser; // 목록/신청자 등에서 선택된 유저
    seller?: MinimalUser; // 없으면 현재 로그인 사용자로 보강
    initialMessage?: string;
    initialSaleStatus?: 'ON_SALE' | 'RESERVED' | 'SOLD';
  }
) {
  // 현재 로그인 사용자 → 기본 seller로 보강
  const { userEmail, userId } = await getLocalIdentity();
  const sellerFromMe: MinimalUser = {
    email: userEmail ?? args.post.authorEmail ?? null,
    id: userId ?? (args.post.authorId != null ? String(args.post.authorId) : null),
    nickname: args.seller?.nickname ?? args.post.authorNickname ?? null,
  };
  const seller: MinimalUser = { ...sellerFromMe, ...args.seller };

  // 필수 파라미터 보정
  const productTitle = ensureTitle(args.post.title);
  const productPrice = ensurePrice(args.post.price);
  const productImageUri = args.post.image ?? undefined;

  // roomId는 post + seller + buyer 조합
  const roomId = buildMarketRoomId(args.post.id, seller, args.buyer);

  navigation.navigate('ChatRoom', {
    source: 'market',
    roomId,
    postId: args.post.id,
    productTitle,                  // ✅ string 보장
    productPrice,                  // ✅ number 보장
    productImageUri,
    postCreatedAt: args.post.createdAt,

    // 판매자 정보
    sellerId: seller.id != null ? String(seller.id) : undefined,
    sellerEmail: seller.email ?? undefined,
    sellerNickname: seller.nickname ?? undefined,

    // 구매자 정보
    buyerId: args.buyer.id != null ? String(args.buyer.id) : undefined,
    buyerEmail: args.buyer.email ?? undefined,
    buyerNickname: args.buyer.nickname ?? undefined,

    // ✅ opponent=구매자
    opponentId: args.buyer.id != null ? String(args.buyer.id) : undefined,
    opponentEmail: args.buyer.email ?? undefined,
    opponentNickname: args.buyer.nickname ?? undefined,
    opponentDept: args.buyer.dept ?? undefined,
    opponentAvatarUri: args.buyer.avatarUri ?? undefined,

    initialMessage: args.initialMessage,
    initialSaleStatus: args.initialSaleStatus,
  });
}
