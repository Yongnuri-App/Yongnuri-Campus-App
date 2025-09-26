// pages/Market/MarketDetailPage.tsx
import DetailBottomBar from '@/components/Bottom/DetailBottomBar';
import AdminActionSheet from '@/components/Modals/AdminActionSheet/AdminActionSheet';
import ProfileRow from '@/components/Profile/ProfileRow';
import { useDeletePost } from '@/hooks/useDeletePost';
import { useLike } from '@/hooks/useLike';
import usePermissions from '@/hooks/usePermissions';
import { updatePostLikeCountInList } from '@/repositories/marketRepo';
import { resolveRoomIdForOpen } from '@/storage/chatStore'; // ✅ 기존 방 재사용
import type { RootStackScreenProps } from '@/types/navigation';
import { getLocalIdentity } from '@/utils/localIdentity';
import { getProfileByEmail, toDisplayName } from '@/utils/session';
import { loadJson, saveJson } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
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

/** AsyncStorage 키 상수 */
const POSTS_KEY = 'market_posts_v1';
const LIKED_MAP_KEY = 'market_liked_map_v1';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** 마켓 게시글 타입 (로컬 드래프트/모킹 데이터 기준) */
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

  /** ✅ 작성자 메타(판매자 판별/표시용) */
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;

  /** ✅ (선택) 판매 상태: 있으면 채팅 초깃값으로 전달 */
  status?: 'ON_SALE' | 'RESERVED' | 'SOLD';
};

/** "n분 전" 표기 헬퍼 */
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

/** ✅ 안정적인 roomId(로컬 제안값) 생성: 게시글 + seller + buyer 조합 */
const norm = (s?: string | number | null) =>
  (s == null ? '' : String(s)).trim().toLowerCase();
function buildMarketRoomId(
  postId: string,
  sellerKey: string | number | null | undefined,
  buyerKey: string | number | null | undefined
) {
  return `m_${postId}__s_${norm(sellerKey)}__b_${norm(buyerKey)}`;
}

export default function MarketDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'MarketDetail'>) {
  const { id } = route.params;

  // ===== 상태 훅 (항상 최상위에서 호출) =====
  const [item, setItem] = useState<MarketPost | null>(null);
  const [index, setIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const hScrollRef = useRef<ScrollView | null>(null);

  /** 좋아요 훅 */
  const { liked, syncCount } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
  });

  /** 상세 로드 */
  const loadItem = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list: MarketPost[] = raw ? JSON.parse(raw) : [];
      const found = list.find((p) => String(p.id) === String(id)) ?? null;

      setItem(found);
      if (!found) {
        Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      // 좋아요 카운트 동기화
      syncCount(found.likeCount ?? 0);
    } catch (e) {
      console.log('market detail load error', e);
      Alert.alert('오류', '게시글을 불러오지 못했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    }
  }, [id, navigation, syncCount]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => loadItem());
    return unsub;
  }, [navigation, loadItem]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  /** 삭제 훅 */
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

  /** 권한 파생: 관리자/소유자 */
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  /**
   * ✅ 닉네임/학과 표시 상태(판매자/작성자)
   * - 이메일 기반 프로필 조회 → (없으면) authorName/authorDept → (그래도 없으면) '익명'
   */
  const [authorNickname, setAuthorNickname] = useState<string>('익명');
  const [authorDeptLabel, setAuthorDeptLabel] = useState<string>('');
  useEffect(() => {
    (async () => {
      if (!item) return;

      // 1) 이메일로 프로필 조회(최신 표준)
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
            return;
          }
        } catch (e) {
          console.log('profile lookup failed:', e);
        }
      }

      // 2) 이메일 프로필 없거나 실패 → 과거 메타로 폴백
      const nick = item.authorName || '익명';
      setAuthorNickname(nick);
      setAuthorDeptLabel(item.authorDept || '');
    })();
  }, [item]);

  /** ✅ 현재 로그인 사용자(=잠재적 구매자) 정보 */
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

  /** ✅ 내 닉네임(구매자/문의자 이름) — 판매자 화면 헤더에 보여주려면 필요 */
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
        const nick =
          toDisplayName({ name: prof?.name, nickname: prof?.nickname }, true) ||
          '사용자';
        setMyNickname(nick);
      } catch {
        setMyNickname('사용자');
      }
    })();
  }, [meEmail]);

  /** 가격 표기 */
  const priceDisplay = useMemo(() => {
    if (!item) return '';
    return item.mode === 'donate'
      ? '나눔'
      : `₩ ${Number(item.price ?? 0).toLocaleString('ko-KR')}`;
  }, [item]);

  /** 이미지 인덱스 업데이트 */
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고 화면으로 이동 */
  const onPressReport = () => {
    navigation.navigate('Report', {
      targetNickname: authorNickname,
      targetDept: authorDeptLabel || undefined,
      targetEmail: item?.authorEmail ?? null,
    });
  };

  // ======================================================================
  // ⬇⬇⬇ 훅 순서가 깨지지 않도록, 아래 훅들도 모두 "조건문 밖"에서 선언 ⬇⬇⬇
  // ======================================================================

  /** 판매자/구매자 식별 키(존재하는 값 우선) */
  const sellerIdKey = item?.authorId != null ? String(item?.authorId) : null;
  const sellerEmailKey = item?.authorEmail ?? null;

  /** 로컬 제안 roomId — item이 없으면 빈 문자열 */
  const proposedRoomId = useMemo(() => {
    if (!item) return '';
    return buildMarketRoomId(
      String(item.id),
      // seller key: 이메일 우선 → 없으면 id
      sellerEmailKey || sellerIdKey,
      // buyer key: 이메일 우선 → 없으면 id
      meEmail || meId
    );
  }, [item, sellerEmailKey, sellerIdKey, meEmail, meId]);

  /** ChatRoom으로 넘길 원본 네비 파라미터 — item 없으면 null */
  const chatOriginParams = useMemo(() => {
    if (!item) return null;
    const firstImage =
      Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined;
    return {
      // === 스레드 식별 핵심 ===
      source: 'market' as const, // 'market' | 'lost' | 'groupbuy'
      postId: String(item.id),
      sellerEmail: sellerEmailKey ?? undefined,
      sellerId: sellerIdKey ?? undefined,
      buyerEmail: meEmail ?? undefined,
      buyerId: meId ?? undefined, // 보강
      opponentEmail: meEmail ?? undefined, // 보강(과거 필드 호환)

      // === ChatRoom UI에 쓰이는 부가 파라미터 ===
      sellerNickname: authorNickname,
      productTitle: item.title,
      productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
      productImageUri: firstImage,
      initialSaleStatus: item.status ?? 'ON_SALE',
      postCreatedAt: item.createdAt,

      // 구매자(나)의 닉네임도 함께 전달 → 판매자 화면에서 상대 이름 표시용
      buyerNickname: myNickname,
    };
  }, [
    item,
    sellerEmailKey,
    sellerIdKey,
    meEmail,
    meId,
    authorNickname,
    myNickname,
  ]);

  /** 동일 맥락의 기존 채팅방이 있으면 그 roomId로 재사용 */
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

  // ======================================================================
  // ⬆⬆⬆ 여기까지 모든 훅 호출 완료. 이제부터는 자유롭게 조건부 렌더 OK ⬆⬆⬆
  // ======================================================================

  // item이 아직 없을 때 로딩 뷰
  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  // UI 전용 이미지 배열(이제 item은 존재 보장)
  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  /** 우상단 버튼: 관리자/소유자 ⇒ 옵션(모달), 일반 ⇒ 신고 */
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
      {/* ===== 상단 이미지 영역 ===== */}
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
              onMomentumScrollEnd={onMomentumEnd}
              contentOffset={{ x: 0, y: 0 }}
            >
              {images.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.mainImage} />
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
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {/* ===== 본문 ===== */}
        <View style={styles.body}>
          {/* ✅ 이메일 기반 최신 프로필 표시 + 폴백 */}
          <ProfileRow
            emailForLookup={item.authorEmail ?? null}
            preferNickname
            fallbackName={authorNickname}
            fallbackDept={authorDeptLabel || ' '}
          />

          <View style={styles.divider} />

          {/* 제목/가격/시간 */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>{priceDisplay}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>

          {/* 설명 */}
          <Text style={styles.desc}>{item.description}</Text>

          {/* 거래 희망 장소 */}
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>거래 희망 장소</Text>
            <Text style={styles.locationValue}>{item.location}</Text>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ===== 하단 고정 바 ===== */}
      {/* ✅ 작성자 본인이라면 상세에서 채팅 시작을 숨김 */}
      {!isOwner && (
        <DetailBottomBar
          variant="detail"
          initialLiked={liked}
          onToggleLike={async (likedFlag) => {
            // ✅ 좋아요 로컬 동기화
            const likedMap = await loadJson<Record<string, boolean>>(
              LIKED_MAP_KEY,
              {}
            );
            likedMap[id] = likedFlag;
            await saveJson(LIKED_MAP_KEY, likedMap);

            setItem((prev) => {
              if (!prev) return prev;
              const nextCount = Math.max(
                0,
                (prev.likeCount ?? 0) + (likedFlag ? 1 : -1)
              );
              updatePostLikeCountInList(POSTS_KEY, prev.id, nextCount);
              return { ...prev, likeCount: nextCount };
            });
          }}
          /**
           * ✅ ChatRoom으로 넘어갈 때 필요한 모든 파라미터 전달
           *  - `source: 'market'`는 항상 명시 (리터럴 유지)
           *  - 동일 맥락 방 재사용을 위해 buyerId/buyerEmail/buyerNickname도 전달
           */
          chatAutoNavigateParams={{
            // ---- 필수(마켓 스키마) ----
            source: 'market',
            postId: String(item.id),
            productTitle: item.title,
            productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
            productImageUri: images[0] ?? undefined,
            initialSaleStatus: item.status ?? 'ON_SALE',

            // ---- 소유자 메타(OwnerMeta 추정) ----
            authorId: item.authorId,
            authorEmail: item.authorEmail ?? null,

            // ---- 공통 메타(ChatCommonMeta 추정) ----
            roomId: resolvedRoomId || proposedRoomId,
            postCreatedAt: item.createdAt,
            sellerNickname: authorNickname,

            // ✅ 구매자(나) 정보 — 판매자 화면에서 상대 닉네임 표시에 필요
            buyerId: meId ?? undefined,
            buyerEmail: meEmail ?? undefined,
            buyerNickname: myNickname,

            // 상대(=판매자) 정보 — 현재 로그인 사용자의 상대
            opponentId: item.authorId != null ? String(item.authorId) : undefined,
            opponentEmail: item.authorEmail ?? undefined,
            opponentNickname: authorNickname,
            opponentDept: authorDeptLabel || undefined,
            opponentAvatarUri: undefined,
          }}
        />
      )}

      {/* ✅ 관리자/판매자 공통 옵션 모달 */}
      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner}
          onEdit={() =>
            navigation.navigate('SellItem', { mode: 'edit', id })
          }
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
