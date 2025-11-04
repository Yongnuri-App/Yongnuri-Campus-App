// hooks/useAuthorVerification.ts
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

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

  // ✅ 초기값 필수! null로 시작하고 union 타입으로 지정
  const onFetchedRef = useRef<VerificationParams['onRoomDetailFetched'] | null>(null);

  useEffect(() => {
    onFetchedRef.current = onRoomDetailFetched ?? null;
  }, [onRoomDetailFetched]);

  useEffect(() => {
    if (!serverRoomId || !roomId) return;

    let cancelled = false;

    (async () => {
      try {
        const { getRoomDetail } = await import('@/api/chat');
        const data = await getRoomDetail(serverRoomId);
        if (cancelled) return;

        // 최신 콜백 실행 (null-safe)
        onFetchedRef.current?.(data);

        // 🛒 중고거래 판매자 확인
        if (data?.roomInfo?.chatType === 'USED_ITEM') {
          const postId = data.roomInfo.chatTypeId;
          if (typeof postId === 'number') {
            const result = await verifyMarketAuthor(postId, raw);
            if (!cancelled && result) setServerSellerInfo(result);
          }
        }

        // 📦 분실물 작성자 확인
        if (data?.roomInfo?.chatType === 'LOST_ITEM') {
          const postId = data.roomInfo.chatTypeId;
          if (typeof postId === 'number') {
            const result = await verifyLostAuthor(postId, raw);
            if (!cancelled && result) setServerLostAuthorInfo(result);
          }
        }
      } catch (e) {
        if (!cancelled) console.log('[useAuthorVerification] error', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serverRoomId, roomId, raw]); // onRoomDetailFetched는 ref로 처리

  return { serverSellerInfo, serverLostAuthorInfo };
}

// ===== 내부 헬퍼들 (그대로) =====
async function verifyMarketAuthor(postId: number, raw: any): Promise<AuthorInfo | null> {
  const { userEmail: meEmail, userId: meId } = await getLocalIdentity();
  const meIdStr = meId ? String(meId) : '';
  if (!postId || !meIdStr) return null;

  try {
    const quickCheck = checkRawParams(raw, meIdStr, meEmail);
    if (quickCheck) return quickCheck;

    const cacheCheck = await checkMarketCache(postId, meIdStr, meEmail);
    if (cacheCheck) return cacheCheck;

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
    const quickCheck = checkLostRawParams(raw, meIdStr, meEmail);
    if (quickCheck) return quickCheck;

    const cacheCheck = await checkLostCache(postId, meIdStr, meEmail);
    if (cacheCheck) return cacheCheck;

    const serverCheck = await checkLostServer(postId, meIdStr, meEmail);
    if (serverCheck) return serverCheck;
  } catch (e) {
    console.log('[verifyLostAuthor] error', e);
  }
  return null;
}

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
