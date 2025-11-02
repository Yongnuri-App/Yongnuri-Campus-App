// hooks/useAuthorVerification.ts
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

type AuthorInfo = {
  authorId?: string | number;
  authorEmail?: string;
};

type VerificationParams = {
  serverRoomId?: number;
  roomId?: string | null;
  raw: any;
  onRoomDetailFetched?: (data: any) => void;
};

export default function useAuthorVerification({
  serverRoomId,
  roomId,
  raw,
  onRoomDetailFetched,
}: VerificationParams) {
  const [serverSellerInfo, setServerSellerInfo] = useState<AuthorInfo | null>(null);
  const [serverLostAuthorInfo, setServerLostAuthorInfo] = useState<AuthorInfo | null>(null);

  useEffect(() => {
    (async () => {
      if (!serverRoomId || !roomId) return;

      try {
        const { getRoomDetail } = await import('@/api/chat');
        const data = await getRoomDetail(serverRoomId);

        // 콜백으로 헤더 보강 등 다른 로직 처리
        onRoomDetailFetched?.(data);

        // 🛒 중고거래 판매자 확인
        if (data?.roomInfo?.chatType === 'USED_ITEM') {
          const postId = data.roomInfo.chatTypeId;
          if (typeof postId === 'number') {  // ✅ 타입 가드
            const result = await verifyMarketAuthor(postId, raw);
            if (result) setServerSellerInfo(result);
          }
        }

        // 📦 분실물 작성자 확인
        if (data?.roomInfo?.chatType === 'LOST_ITEM') {
          const postId = data.roomInfo.chatTypeId;
          if (typeof postId === 'number') {  // ✅ 타입 가드
            const result = await verifyLostAuthor(postId, raw);
            if (result) setServerLostAuthorInfo(result);
          }
        }
      } catch (e: any) {
        console.log('[useAuthorVerification] error', e);
      }
    })();
  }, [serverRoomId, roomId, raw]);

  return { serverSellerInfo, serverLostAuthorInfo };
}

// ========== 내부 헬퍼 함수들 ==========

async function verifyMarketAuthor(postId: number, raw: any): Promise<AuthorInfo | null> {
  const { userEmail: meEmail, userId: meId } = await getLocalIdentity();
  const meIdStr = meId ? String(meId) : '';

  if (!postId || !meIdStr) return null;

  try {
    // 1️⃣ raw 파라미터에서 빠른 확인
    const quickCheck = checkRawParams(raw, meIdStr, meEmail);
    if (quickCheck) return quickCheck;

    // 2️⃣ AsyncStorage 캐시 확인
    const cacheCheck = await checkMarketCache(postId, meIdStr, meEmail);
    if (cacheCheck) return cacheCheck;

    // 3️⃣ 서버 API 호출
    const serverCheck = await checkMarketServer(postId, meIdStr, meEmail);
    if (serverCheck) return serverCheck;
  } catch (e) {
    console.log('[verifyMarketAuthor] error', e);
  }

  return null;
}

async function verifyLostAuthor(postId: number, raw: any): Promise<AuthorInfo | null> {
  const { userEmail: meEmail, userId: meId } = await getLocalIdentity();
  const meIdStr = meId ? String(meId) : '';

  if (!postId || !meIdStr) return null;

  try {
    // 1️⃣ raw 파라미터에서 빠른 확인
    const quickCheck = checkLostRawParams(raw, meIdStr, meEmail);
    if (quickCheck) return quickCheck;

    // 2️⃣ AsyncStorage 캐시 확인
    const cacheCheck = await checkLostCache(postId, meIdStr, meEmail);
    if (cacheCheck) return cacheCheck;

    // 3️⃣ 서버 API 호출
    const serverCheck = await checkLostServer(postId, meIdStr, meEmail);
    if (serverCheck) return serverCheck;
  } catch (e) {
    console.log('[verifyLostAuthor] error', e);
  }

  return null;
}

// ========== 중고거래 확인 함수들 ==========

function checkRawParams(raw: any, meIdStr: string, meEmail: string | null): AuthorInfo | null {
  const authorIdFromRaw = raw?.authorId ?? raw?.sellerId ?? raw?.postOwnerId;
  if (!authorIdFromRaw) return null;

  const authorIdStr = String(authorIdFromRaw);
  if (authorIdStr === meIdStr) {
    console.log('[Market] ✅ 판매자 확인됨 (raw)');
    return { authorId: meIdStr, authorEmail: meEmail ?? undefined };
  }
  return null;
}

async function checkMarketCache(
  postId: number,
  meIdStr: string,
  meEmail: string | null
): Promise<AuthorInfo | null> {
  const KEY = 'market_posts_v1';
  const rawList = await AsyncStorage.getItem(KEY);
  if (!rawList) return null;

  const list = JSON.parse(rawList);
  const post = Array.isArray(list)
    ? list.find((p: any) => String(p?.id) === String(postId))
    : null;

  if (!post) return null;

  const postAuthorId = String(
    post.authorId ?? post.sellerId ?? post.userId ?? post.writerId ??
    post.author_id ?? post.seller_id ?? post.user_id ?? ''
  );
  const postAuthorEmail = (
    post.authorEmail ?? post.sellerEmail ?? post.userEmail ?? post.writerEmail ??
    post.author_email ?? post.seller_email ?? post.user_email ?? ''
  ).trim().toLowerCase();
  const meEmailNorm = (meEmail ?? '').trim().toLowerCase();

  const iAmAuthor =
    (postAuthorId && postAuthorId === meIdStr) ||
    (postAuthorEmail && meEmailNorm && postAuthorEmail === meEmailNorm);

  if (iAmAuthor) {
    console.log('[Market] ✅ 판매자 확인됨 (cache)');
    return { authorId: meIdStr, authorEmail: meEmail ?? undefined };
  }

  return null;
}

async function checkMarketServer(
  postId: number,
  meIdStr: string,
  meEmail: string | null
): Promise<AuthorInfo | null> {
  try {
    const { getMarketPost } = await import('@/api/market');
    const post = await getMarketPost(postId);
    if (!post) return null;

    const postAuthorId = String(
      post.authorId ?? post.sellerId ?? post.userId ?? post.writerId ??
      post.author_id ?? post.seller_id ?? post.user_id ??
      post.writer_id ?? post.created_by ?? ''
    );
    const postAuthorEmail = (
      post.authorEmail ?? post.sellerEmail ?? post.userEmail ?? post.writerEmail ??
      post.author_email ?? post.seller_email ?? post.user_email ??
      post.writer_email ?? ''
    ).trim().toLowerCase();
    const meEmailNorm = (meEmail ?? '').trim().toLowerCase();

    const iAmAuthor =
      (postAuthorId && postAuthorId === meIdStr) ||
      (postAuthorEmail && meEmailNorm && postAuthorEmail === meEmailNorm);

    if (iAmAuthor) {
      console.log('[Market] ✅ 판매자 확인됨 (server)');
      return { authorId: meIdStr, authorEmail: meEmail ?? undefined };
    }
  } catch (e) {
    console.log('[Market] server check failed', e);
  }

  return null;
}

// ========== 분실물 확인 함수들 ==========

function checkLostRawParams(raw: any, meIdStr: string, meEmail: string | null): AuthorInfo | null {
  const authorIdFromRaw =
    raw?.authorId ?? raw?.writerId ?? raw?.userId ?? raw?.ownerId ?? raw?.postOwnerId;
  const authorEmailFromRaw =
    (raw?.authorEmail ?? raw?.writerEmail ?? raw?.userEmail ?? raw?.ownerEmail ?? '').trim().toLowerCase();

  if (!authorIdFromRaw && !authorEmailFromRaw) return null;

  const authorIdStr = authorIdFromRaw ? String(authorIdFromRaw) : '';
  const meEmailNorm = (meEmail ?? '').trim().toLowerCase();

  const iAmAuthor =
    (!!authorIdStr && authorIdStr === meIdStr) ||
    (!!authorEmailFromRaw && !!meEmailNorm && authorEmailFromRaw === meEmailNorm);

  if (iAmAuthor) {
    console.log('[Lost] ✅ 작성자 확인됨 (raw)');
    return { authorId: meIdStr, authorEmail: meEmail ?? undefined };
  }

  return null;
}

async function checkLostCache(
  postId: number,
  meIdStr: string,
  meEmail: string | null
): Promise<AuthorInfo | null> {
  const KEY = 'lost_found_posts_v1';
  const rawList = await AsyncStorage.getItem(KEY);
  if (!rawList) return null;

  const list = JSON.parse(rawList);
  const post = Array.isArray(list)
    ? list.find((p: any) => String(p?.id) === String(postId))
    : null;

  if (!post) return null;

  const postAuthorId = String(
    post.authorId ?? post.writerId ?? post.userId ?? post.ownerId ??
    post.author_id ?? post.writer_id ?? post.user_id ?? post.owner_id ?? ''
  );
  const postAuthorEmail = (
    post.authorEmail ?? post.writerEmail ?? post.userEmail ?? post.ownerEmail ??
    post.author_email ?? post.writer_email ?? post.user_email ?? post.owner_email ?? ''
  ).trim().toLowerCase();
  const meEmailNorm = (meEmail ?? '').trim().toLowerCase();

  const iAmAuthor =
    (!!postAuthorId && postAuthorId === meIdStr) ||
    (!!postAuthorEmail && !!meEmailNorm && postAuthorEmail === meEmailNorm);

  if (iAmAuthor) {
    console.log('[Lost] ✅ 작성자 확인됨 (cache)');
    return { authorId: meIdStr, authorEmail: meEmail ?? undefined };
  }

  return null;
}

async function checkLostServer(
  postId: number,
  meIdStr: string,
  meEmail: string | null
): Promise<AuthorInfo | null> {
  try {
    const { getLostFoundDetail } = await import('@/api/lost');
    const post = await getLostFoundDetail(postId);
    if (!post) return null;

    const postAuthorId = String(
      (post as any).authorId ?? (post as any).writerId ?? (post as any).userId ?? (post as any).ownerId ??
      (post as any).author_id ?? (post as any).writer_id ?? (post as any).user_id ?? (post as any).owner_id ?? ''
    );
    const postAuthorEmail = (
      (post as any).authorEmail ?? (post as any).writerEmail ?? (post as any).userEmail ?? (post as any).ownerEmail ??
      (post as any).author_email ?? (post as any).writer_email ?? (post as any).user_email ?? (post as any).owner_email ?? ''
    ).trim().toLowerCase();
    const meEmailNorm = (meEmail ?? '').trim().toLowerCase();

    const iAmAuthor =
      (!!postAuthorId && postAuthorId === meIdStr) ||
      (!!postAuthorEmail && !!meEmailNorm && postAuthorEmail === meEmailNorm);

    if (iAmAuthor) {
      console.log('[Lost] ✅ 작성자 확인됨 (server)');
      return { authorId: meIdStr, authorEmail: meEmail ?? undefined };
    }
  } catch (e) {
    console.log('[Lost] server check failed', e);
  }

  return null;
}