// src/pages/Market/MarketDetailPage.tsx
import { getMarketPost } from '@/api/market';
import DetailBottomBar from '@/components/Bottom/DetailBottomBar';
import AdminActionSheet from '@/components/Modals/AdminActionSheet/AdminActionSheet';
import ProfileRow from '@/components/Profile/ProfileRow';
import { useDeletePost } from '@/hooks/useDeletePost';
import { useLike } from '@/hooks/useLike';
import usePermissions from '@/hooks/usePermissions';
import { resolveRoomIdForOpen } from '@/storage/chatStore';
import type { RootStackScreenProps } from '@/types/navigation';
import { getLocalIdentity } from '@/utils/localIdentity';
import { getProfileByEmail, toDisplayName } from '@/utils/session';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import styles from './MarketDetailPage.styles';

// ✅ 전체화면 이미지 뷰어(외부 라이브러리)
import ImageViewing from 'react-native-image-viewing';

const POSTS_KEY = 'market_posts_v1';
const LIKED_MAP_KEY = 'market_liked_map_v1';
const SCREEN_WIDTH = Dimensions.get('window').width;

type MarketPost = {
  id: string;
  title: string;
  description: string;
  mode: 'sell' | 'donate';
  price: number;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;
  status?: 'ON_SALE' | 'RESERVED' | 'SOLD';
  serverPostId?: number; // 서버 정수 ID
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

const norm = (s?: string | number | null) =>
  (s == null ? '' : String(s)).trim().toLowerCase();

function buildMarketRoomId(
  postId: string,
  sellerKey: string | number | null | undefined,
  buyerKey: string | number | null | undefined
) {
  return `m_${postId}__s_${norm(sellerKey)}__b_${norm(buyerKey)}`;
}

const toNum = (v: any): number | undefined =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && /^\d+$/.test(v.trim())
    ? Number(v.trim())
    : undefined;

// 상세 응답에서 작성자 ID 후보 추출(있으면 사용)
function pickAuthorId(data: any): number | undefined {
  const candidates = [
    data?.authorUserId, data?.author_user_id,
    data?.authorId, data?.author_id,
    data?.writerUserId, data?.writer_user_id,
    data?.writerId, data?.writer_id,
    data?.userId, data?.user_id,
    data?.createdById, data?.created_by_id,
  ];
  for (const c of candidates) {
    const n = toNum(c);
    if (n !== undefined) return n;
  }
  return undefined;
}

export default function MarketDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'MarketDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<MarketPost | null>(null);
  const [index, setIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const hScrollRef = useRef<ScrollView | null>(null);

  // ✅ 상세 이미지 전체화면 뷰어 상태
  const [viewerVisible, setViewerVisible] = useState(false); // 모달 보이기/숨기기
  const [viewerIndex, setViewerIndex] = useState(0);         // 시작 인덱스

  // 이미지 탭 시 해당 인덱스에서 뷰어 오픈
  const openViewerAt = useCallback((startIdx: number) => {
    setViewerIndex(startIdx);
    setViewerVisible(true);
  }, []);
  const closeViewer = useCallback(() => setViewerVisible(false), []);

  const { liked, syncCount, toggleLike } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
    postType: 'USED_ITEM',
    syncServer: true,
  });

  const loadItem = useCallback(async () => {
    try {
      const data = await getMarketPost(id);
      console.log('[MarketDetailPage] 상세 조회 성공(정규화전)', data);

      const imageUrls: string[] = Array.isArray(data?.images)
        ? data.images.map((it: any) => it?.imageUrl).filter(Boolean)
        : [];

      const statusNorm =
        data?.status === 'SELLING'
          ? 'ON_SALE'
          : data?.status === 'RESERVED'
          ? 'RESERVED'
          : 'SOLD';

      const createdAt =
        data?.createdAt || data?.created_at || new Date().toISOString();

      const authorNickname = data?.authorNickname || '익명';
      const authorDept =
        data?.authorDept || data?.authorDepartment || data?.department || '';

      const authorIdPicked = pickAuthorId(data); // 있으면 사용
      if (authorIdPicked === undefined) {
        console.log('[MarketDetailPage] ⚠ 작성자 ID 미검출: 응답 키들을 확인하세요.');
      }

      setItem({
        id: String(data?.post_id ?? data?.id ?? id),
        title: data?.title ?? '',
        description: data?.content ?? '',
        mode: Number(data?.price ?? 0) === 0 ? 'donate' : 'sell',
        price: Number(data?.price ?? 0),
        location: data?.location ?? '',
        images: imageUrls,
        likeCount: Number(data?.bookmarkCount ?? 0),
        createdAt,
        authorEmail: data?.authorEmail ?? null,
        authorName: authorNickname,
        authorDept,
        status: statusNorm,
        authorId: authorIdPicked, // number | undefined
        serverPostId: Number(data?.post_id ?? data?.id ?? NaN),
      });

      syncCount(Number(data?.bookmarkCount ?? 0));
    } catch (e: any) {
      console.log('[MarketDetailPage] 상세 조회 오류', e?.response?.data || e);
    }
  }, [id, syncCount]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => loadItem());
    return unsub;
  }, [navigation, loadItem]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const { confirmAndDelete } = useDeletePost({
    postId: id,
    postsKey: POSTS_KEY,
    likedMapKey: LIKED_MAP_KEY,
    navigation,
    confirmTitle: '삭제',
    confirmMessage: '정말로 이 게시글을 삭제할까요?',
    confirmOkText: '삭제',
    confirmCancelText: '취소',
  });

  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  const [authorNickname, setAuthorNickname] = useState<string>('익명');
  const [authorDeptLabel, setAuthorDeptLabel] = useState<string>('');
  const [authorUserId, setAuthorUserId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!item) return;

      const baseId = toNum(item.authorId);
      setAuthorUserId(baseId ?? null);

      if (item.authorEmail) {
        try {
          const prof = await getProfileByEmail(item.authorEmail);
          if (prof) {
            const nick =
              toDisplayName({ name: prof.name, nickname: prof.nickname }, true) ||
              item.authorName ||
              '익명';
            setAuthorNickname(nick);
            setAuthorDeptLabel(prof.department || item.authorDept || '');

            const fromProfile = toNum((prof as any)?.id) ?? toNum((prof as any)?.userId);
            if (fromProfile !== undefined) {
              setAuthorUserId(fromProfile);
              console.log('[MarketDetailPage] 프로필에서 작성자 ID 확정:', fromProfile);
            }
            return;
          }
        } catch (e) {
          console.log('profile lookup failed:', e);
        }
      }

      setAuthorNickname(item.authorName || '익명');
      setAuthorDeptLabel(item.authorDept || '');
    })();
  }, [item]);

  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { userEmail, userId } = await getLocalIdentity();
        setMeEmail(userEmail ?? null);
        setMeId(userId ?? null);
      } catch {
        setMeEmail(null);
        setMeId(null);
      }
    })();
  }, []);

  const [myNickname, setMyNickname] = useState<string>('사용자');
  useEffect(() => {
    (async () => {
      const email = (meEmail || '').trim();
      if (!email) {
        setMyNickname('사용자');
        return;
      }
      try {
        const prof = await getProfileByEmail(email);
        const nick = toDisplayName({ name: prof?.name, nickname: prof?.nickname }, true) || '사용자';
        setMyNickname(nick);
      } catch {
        setMyNickname('사용자');
      }
    })();
  }, [meEmail]);

  const priceDisplay = useMemo(() => {
    if (!item) return '';
    return item.mode === 'donate' ? '나눔' : `₩ ${Number(item.price ?? 0).toLocaleString('ko-KR')}`;
  }, [item]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고 화면으로 이동: reportedId 있으면 넘기고, 없으면 undefined로(서버 유추) */
  const onPressReport = React.useCallback(() => {
    if (!item) return;

    const numericPostId =
      typeof item.serverPostId === 'number' && Number.isFinite(item.serverPostId)
        ? String(item.serverPostId)
        : String(item.id);

    const reportedIdCandidate = toNum(authorUserId) ?? toNum(item.authorId) ?? undefined;

    console.log('[MarketDetailPage] 신고 이동 파라미터', {
      numericPostId,
      reportedIdCandidate,
      authorEmail: item.authorEmail,
    });

    navigation.navigate('Report', {
      mode: 'compose',
      targetNickname: authorNickname,
      targetDept: authorDeptLabel || undefined,
      targetEmail: item.authorEmail ?? undefined,

      targetPostId: numericPostId, // 서버 숫자 id 우선
      targetStorageKey: POSTS_KEY,
      targetPostTitle: item.title,
      targetKind: 'market',

      targetUserId: reportedIdCandidate, // undefined 가능
    });
  }, [item, navigation, authorNickname, authorDeptLabel, authorUserId]);

  const sellerIdKey = item?.authorId != null ? String(item?.authorId) : null;
  const sellerEmailKey = item?.authorEmail ?? null;

  const proposedRoomId = useMemo(() => {
    if (!item) return '';
    return buildMarketRoomId(String(item.id), sellerEmailKey || sellerIdKey, meEmail || meId);
  }, [item, sellerEmailKey, sellerIdKey, meEmail, meId]);

  const chatOriginParams = useMemo(() => {
    if (!item) return null;
    const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined;
    return {
      source: 'market' as const,
      postId: String(item.id),
      sellerEmail: sellerEmailKey ?? undefined,
      sellerId: sellerIdKey ?? undefined,
      buyerEmail: meEmail ?? undefined,
      buyerId: meId ?? undefined,
      opponentEmail: item.authorEmail ?? undefined,
      sellerNickname: authorNickname,
      productTitle: item.title,
      productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
      productImageUri: firstImage,
      initialSaleStatus: item.status ?? 'ON_SALE',
      postCreatedAt: item.createdAt,

      buyerNickname: myNickname,
    };
  }, [item, sellerEmailKey, sellerIdKey, meEmail, meId, authorNickname, myNickname]);

  const [resolvedRoomId, setResolvedRoomId] = useState<string>('');
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!item || !proposedRoomId || !chatOriginParams) {
          if (mounted) setResolvedRoomId('');
          return;
        }
        const fixed = await resolveRoomIdForOpen(chatOriginParams, proposedRoomId);
        if (mounted) setResolvedRoomId(fixed);
      } catch (e) {
        console.log('resolveRoomIdForOpen error', e);
        if (mounted) setResolvedRoomId(proposedRoomId || '');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [item, proposedRoomId, chatOriginParams]);

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  const RightTopButton = () => {
    if (isAdmin || isOwner) {
      return (
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconRightTop]}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="게시글 옵션"
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image source={require('@/assets/images/more_white.png')} style={styles.icon} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconRightTop]}
        onPress={onPressReport}
        accessibilityRole="button"
        accessibilityLabel="신고하기"
        activeOpacity={0.9}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image source={require('@/assets/images/alert_white.png')} style={styles.icon} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageArea}>
          {images.length > 0 ? (
            <ScrollView
              ref={hScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                setIndex(Math.round(x / SCREEN_WIDTH));
              }}
              contentOffset={{ x: 0, y: 0 }}
            >
              {images.map((uri, i) => (
                // ✅ 각 이미지 탭 시 해당 인덱스에서 전체화면 오픈
                <TouchableOpacity
                  key={`${uri}-${i}`}
                  activeOpacity={0.9}
                  onPress={() => openViewerAt(i)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`이미지 ${i + 1} 크게 보기`}
                >
                  <Image key={`${uri}-${i}`} source={{ uri }} style={styles.mainImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>이미지 없음</Text>
            </View>
          )}

          {/* 좌상단: 뒤로가기 */}
          <TouchableOpacity
            style={[styles.iconBtn, styles.iconLeftTop]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            activeOpacity={0.9}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={require('@/assets/images/back_white.png')} style={styles.icon} />
          </TouchableOpacity>

          {/* 우상단: 역할별 버튼 */}
          <RightTopButton />

          {/* 우하단: 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}</Text>
          </View>
        </View>

        {/* 본문 */}
        <View style={styles.body}>
          {item.authorEmail ? (
            <ProfileRow
              emailForLookup={item.authorEmail ?? undefined}
              preferNickname
              fallbackName={item.authorName || '익명'}
              fallbackDept={item.authorDept || ''}
            />
          ) : (
            <ProfileRow name={item.authorName || '익명'} dept={item.authorDept || ''} />
          )}

          <View style={styles.divider} />

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>{priceDisplay}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>

          <Text style={styles.desc}>{item.description}</Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>거래 희망 장소</Text>
            <Text style={styles.locationValue}>{item.location}</Text>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ✅ 전체화면 이미지 뷰어 (핀치줌/더블탭/스와이프다운 닫기 지원) */}
      <ImageViewing
        images={images.map((u) => ({ uri: u }))}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={closeViewer}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        FooterComponent={({ imageIndex }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{`${imageIndex + 1} / ${images.length}`}</Text>
            </View>
            {/* <Text style={{ color: '#fff', opacity: 0.9 }}>두 번 탭해서 확대/축소 • 아래로 스와이프해 닫기</Text> */}
          </View>
        )}
      />

      {!isOwner && (
        <DetailBottomBar
          variant="detail"
          initialLiked={liked}
          onToggleLike={async (nextLiked) => {
            await toggleLike(nextLiked);
            setItem((prev) => {
              if (!prev) return prev;
              const nextCount = Math.max(0, (prev.likeCount ?? 0) + (nextLiked ? 1 : -1));
              return { ...prev, likeCount: nextCount };
            });
          }}
          chatAutoNavigateParams={{
            source: 'market' as const,
            postId: String(item.id),
            productTitle: item.title,
            productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
            productImageUri: images[0] ?? undefined,
            initialSaleStatus: item.status ?? 'ON_SALE',

            sellerId: item.authorId != null ? String(item.authorId) : undefined,
            sellerEmail: item.authorEmail ?? undefined,
            sellerNickname: authorNickname,

            ...(resolvedRoomId || proposedRoomId ? { roomId: resolvedRoomId || proposedRoomId } : {}),
            postCreatedAt: item.createdAt,

            buyerId: meId ?? undefined,
            buyerEmail: meEmail ?? undefined,
            buyerNickname: myNickname,

            opponentId: item.authorId != null ? String(item.authorId) : undefined,
            opponentEmail: item.authorEmail ?? undefined,
            opponentNickname: authorNickname,
            opponentDept: authorDeptLabel || undefined,
            opponentAvatarUri: undefined,
          }}
        />
      )}

      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner}
          onEdit={() => navigation.navigate('SellItem', { mode: 'edit', id })}
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
