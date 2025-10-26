// pages/My/MyFavorites/MyFavoritesPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { toAbsoluteUrl } from '../../../api/url';
import CategoryTabs, { CategoryTab } from '../../../components/CategoryTabs/CategoryTabs';
import GroupItem from '../../../components/ListTile/GroupItem/GroupItem';
import LostItem from '../../../components/ListTile/LostItem/LostItem';
import MarketItem from '../../../components/ListTile/MarketItem/MarketItem';
import NoticeItem from '../../../components/ListTile/NoticeItem/NoticeItem';
import { getIdentityScope } from '../../../utils/localIdentity';
import styles from './MyFavoritesPage.styles';
// ✅ 서버 관심목록 API
import { fetchMyBookmarks, type PostType } from '@/api/bookmarks';

/* ===== 저장소 키 (베이스) =====
 * - 서버 호출 실패 시(오프라인 등) 기존 로컬 방식으로 폴백
 */
const MARKET_POSTS_KEY = 'market_posts_v1';
const MARKET_LIKED_MAP_KEY = 'market_liked_map_v1';

const LOST_POSTS_KEY = 'lost_found_posts_v1';
const LOST_LIKED_MAP_KEY = 'lost_found_liked_map_v1';

const GROUP_POSTS_KEY = 'groupbuy_posts_v1';
const GROUP_LIKED_MAP_KEY = 'groupbuy_liked_map_v1';

const NOTICE_POSTS_KEY = 'notice_posts_v1';
const NOTICE_LIKED_MAP_KEY = 'notice_liked_map_v1';

const perUser = (base: string, id: string | null) => (id ? `${base}__id:${id}` : base);

/* ===== 타입 ===== */
type MarketPost = {
  id: string;
  title: string;
  description?: string;
  mode?: 'sell' | 'donate';
  price?: number;
  location?: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorDept?: string;
};

type LostPost = {
  id: string;
  title: string;
  type?: 'lost' | 'found';
  createdAt: string; // ISO
  images: string[];
  likeCount: number;
  authorDept?: string;
  location?: string;
};

type RecruitMode = 'unlimited' | 'limited' | null;
type GroupBuyPost = {
  id: string;
  title: string;
  description?: string;
  recruit?: {
    mode: RecruitMode;
    count: number | null;
  };
  applyLink?: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorDept?: string;
};

type NoticePost = {
  id: string;
  title: string;
  description?: string;
  images?: string[];
  startDate?: string; // ISO
  endDate?: string;   // ISO
  createdAt?: string; // ISO
  applyUrl?: string | null;
  likeCount?: number;
};

/* ===== 탭 ===== */
const TABS: CategoryTab[] = [
  { key: 'market', label: '중고거래' },
  { key: 'lost',   label: '분실물' },
  { key: 'group',  label: '공동구매' },
  { key: 'notice', label: '공지사항' },
];

/* ===== 유틸 ===== */
function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}
function ymd(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function isClosed(endIso?: string) {
  if (!endIso) return false;
  return new Date(endIso).getTime() < Date.now();
}

/* ===== 서버 응답 → 우리 카드 모델로 맵핑 도우미 =====
 * 서버 BookmarkResponseDto: { bookmarkId, postId, postType, title, thumbnailUrl, bookmarkedAt }
 * - 각 리스트 타일이 요구하는 필드는 프로젝트마다 조금씩 달라서
 *   일단 "필수만" 채워 카드가 깨지지 않게 보장.
 * - 상세 정보(가격/모집현황 등)가 필요하면, 여기서 postId로 한 번 더 상세조회(batch)해 확장 가능.
 */
const mapMarketFromBookmarks = (rows: Array<{
  postId: number;
  title: string;
  thumbnailUrl?: string | null;
  bookmarkedAt: string;
  likeCount?: number | null;
  price?: number | null;    
  location?: string | null;   
  createdAt?: string | null;    
}>): MarketPost[] =>
  rows.map(r => ({
    id: String(r.postId),
    title: r.title,
    price: typeof r.price === 'number' ? r.price : undefined,  
    location: r.location ?? undefined,                          
    images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
    likeCount: typeof r.likeCount === 'number' ? r.likeCount : 0,
    createdAt: r.createdAt ?? r.bookmarkedAt,                   
  }));

// rows 제네릭 타입에 location/createdAt를 옵션으로 추가
const mapLostFromBookmarks = (rows: Array<{
  postId: number;
  title: string;
  thumbnailUrl?: string | null;
  bookmarkedAt: string;
  likeCount?: number | null;
  location?: string | null;    // ✅ 추가
  createdAt?: string | null;   // ✅ 옵션으로 들어오면 우선 사용
}>): LostPost[] =>
  rows.map(r => ({
    id: String(r.postId),
    title: r.title,
    images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
    likeCount: typeof r.likeCount === 'number' ? r.likeCount : 0,
    createdAt: r.createdAt ?? r.bookmarkedAt,
    location: r.location ?? undefined,
  }));

const mapGroupFromBookmarks = (rows: Array<{
  postId: number; title: string; thumbnailUrl?: string | null; bookmarkedAt: string; likeCount?: number | null;
}>): GroupBuyPost[] =>
  rows.map(r => ({
    id: String(r.postId),
    title: r.title,
    images: r.thumbnailUrl ? [r.thumbnailUrl] : [],
    likeCount: typeof r.likeCount === 'number' ? r.likeCount : 0,
    createdAt: r.bookmarkedAt,
    recruit: { mode: 'unlimited', count: null },
  }));

const toAbs = (u?: string | null) => (u ? toAbsoluteUrl(u) ?? u : undefined);

const mapNoticeFromBookmarks = (rows: Array<{
  postId: number; title: string; thumbnailUrl?: string | null; bookmarkedAt: string;
}>): NoticePost[] =>
  rows.map(r => {
    const abs = toAbs(r.thumbnailUrl);
    return {
      id: String(r.postId),
      title: r.title,
      images: abs ? [abs] : [],
      startDate: r.bookmarkedAt,
      endDate: r.bookmarkedAt,
      createdAt: r.bookmarkedAt,
    };
  });

/* ===== 컴포넌트 ===== */
export default function MyFavoritesPage() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<string>('market');

  const [identity, setIdentity] = useState<string | null>(null);

  // 관심목록 상태
  const [marketFavs, setMarketFavs] = useState<MarketPost[]>([]);
  const [lostFavs, setLostFavs] = useState<LostPost[]>([]);
  const [groupFavs, setGroupFavs] = useState<GroupBuyPost[]>([]);
  const [noticeFavs, setNoticeFavs] = useState<NoticePost[]>([]);

  // 현재 로그인/기기 식별자 로드 (로컬 폴백용 키)
  useEffect(() => {
    (async () => {
      const id = await getIdentityScope(); // email(소문자) 우선, 없으면 기기ID
      setIdentity(id);
    })();
  }, []);

  /* ===== 서버 로더 (실패 시 로컬 폴백) ===== */

  const tryServerThenLocal = useCallback(
    async <T,>(postType: PostType, localLoad: () => Promise<T>, mapFn: (rows: any[]) => T): Promise<T> => {
      try {
        const rows = await fetchMyBookmarks(postType); // ✅ /board/bookmarks?postType=...
        // rows: BookmarkResponseDto[]
        const mapped = mapFn(rows);
        return mapped;
      } catch (e) {
        console.log(`[MyFavorites] server fetch failed for ${postType}, fallback to local`, e);
        return await localLoad();
      }
    },
    []
  );

  const loadMarketFavorites = useCallback(async () => {
    if (identity === undefined) return; // 초기 로딩 중
    // 1) 서버 → 2) 로컬 폴백
    const localLoad = async (): Promise<MarketPost[]> => {
      try {
        const [rawPosts, rawLikedMap] = await Promise.all([
          AsyncStorage.getItem(MARKET_POSTS_KEY),
          AsyncStorage.getItem(perUser(MARKET_LIKED_MAP_KEY, identity)),
        ]);
        const posts: MarketPost[] = rawPosts ? JSON.parse(rawPosts) : [];
        const likedMap: Record<string, boolean> = rawLikedMap ? JSON.parse(rawLikedMap) : {};
        return posts.filter(p => likedMap[p.id]);
      } catch (e) {
        console.log('load market favorites (local) error', e);
        return [];
      }
    };
    const data = await tryServerThenLocal('USED_ITEM', localLoad, mapMarketFromBookmarks);
    setMarketFavs(data);
  }, [identity, tryServerThenLocal]);

  const loadLostFavorites = useCallback(async () => {
    if (identity === undefined) return;
    const localLoad = async (): Promise<LostPost[]> => {
      try {
        const [rawPosts, rawLikedMap] = await Promise.all([
          AsyncStorage.getItem(LOST_POSTS_KEY),
          AsyncStorage.getItem(perUser(LOST_LIKED_MAP_KEY, identity)),
        ]);
        const posts: LostPost[] = rawPosts ? JSON.parse(rawPosts) : [];
        const likedMap: Record<string, boolean> = rawLikedMap ? JSON.parse(rawLikedMap) : {};
        return posts.filter(p => likedMap[p.id]);
      } catch (e) {
        console.log('load lost favorites (local) error', e);
        return [];
      }
    };
    const data = await tryServerThenLocal('LOST_ITEM', localLoad, mapLostFromBookmarks);
    setLostFavs(data);
  }, [identity, tryServerThenLocal]);

  const loadGroupFavorites = useCallback(async () => {
    if (identity === undefined) return;
    const localLoad = async (): Promise<GroupBuyPost[]> => {
      try {
        const [rawPosts, rawLikedMap] = await Promise.all([
          AsyncStorage.getItem(GROUP_POSTS_KEY),
          AsyncStorage.getItem(perUser(GROUP_LIKED_MAP_KEY, identity)),
        ]);
        const posts: GroupBuyPost[] = rawPosts ? JSON.parse(rawPosts) : [];
        const likedMap: Record<string, boolean> = rawLikedMap ? JSON.parse(rawLikedMap) : {};
        return posts.filter(p => likedMap[p.id]);
      } catch (e) {
        console.log('load group favorites (local) error', e);
        return [];
      }
    };
    const data = await tryServerThenLocal('GROUP_BUY', localLoad, mapGroupFromBookmarks);
    setGroupFavs(data);
  }, [identity, tryServerThenLocal]);

  const loadNoticeFavorites = useCallback(async () => {
    if (identity === undefined) return;
    const localLoad = async (): Promise<NoticePost[]> => {
      try {
        const [rawPosts, rawLikedMap] = await Promise.all([
          AsyncStorage.getItem(NOTICE_POSTS_KEY),
          AsyncStorage.getItem(perUser(NOTICE_LIKED_MAP_KEY, identity)),
        ]);
        const posts: NoticePost[] = rawPosts ? JSON.parse(rawPosts) : [];
        const likedMap: Record<string, boolean> = rawLikedMap ? JSON.parse(rawLikedMap) : {};
        return posts.filter(p => likedMap[p.id]);
      } catch (e) {
        console.log('load notice favorites (local) error', e);
        return [];
      }
    };
    const data = await tryServerThenLocal('NOTICE', localLoad, mapNoticeFromBookmarks);
    setNoticeFavs(data);
  }, [identity, tryServerThenLocal]);

  /* 포커스 복귀 시 탭별 로딩 */
  useFocusEffect(
    React.useCallback(() => {
      if (!identity) return; // 아직 아이덴티티 없음(로컬 폴백 키 준비 전)
      if (activeTab === 'market') loadMarketFavorites();
      if (activeTab === 'lost')   loadLostFavorites();
      if (activeTab === 'group')  loadGroupFavorites();
      if (activeTab === 'notice') loadNoticeFavorites();
    }, [identity, activeTab, loadMarketFavorites, loadLostFavorites, loadGroupFavorites, loadNoticeFavorites])
  );

  /* 최초 진입/탭 변경 시 로딩 */
  useEffect(() => {
    if (!identity) return;
    if (activeTab === 'market') loadMarketFavorites();
    if (activeTab === 'lost')   loadLostFavorites();
    if (activeTab === 'group')  loadGroupFavorites();
    if (activeTab === 'notice') loadNoticeFavorites();
  }, [identity, activeTab, loadMarketFavorites, loadLostFavorites, loadGroupFavorites, loadNoticeFavorites]);

  /* ===== 네비게이션 핸들러 ===== */
  const onPressBack = () => navigation.goBack();
  const onPressMarketItem = (id: string) => navigation.navigate('MarketDetail', { id });
  const onPressLostItem = (id: string) => navigation.navigate('LostDetail', { id });
  const onPressGroupItem = (id: string) => navigation.navigate('GroupBuyDetail', { id });
  const onPressNoticeItem = (id: string) => navigation.navigate('NoticeDetail', { id });

  /* ===== 렌더러들 =====
   * 서버 북마크 응답에는 price / recruit 등 상세 필드가 없으므로,
   * 리스트 타일이 요구하는 필드는 "표시 가능한 최소값"으로 채운다.
   * (필요하면 postId로 batch 상세조회 API 추가 가능)
   */
  const renderMarketList = () => {
    if (marketFavs.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>좋아요한 중고거래가 없어요.</Text>
        </View>
      );
    }
    return marketFavs.map((p) => {
      const subtitleParts: string[] = [];
      if (p.location) subtitleParts.push(p.location);            // 위치 먼저
      subtitleParts.push(timeAgo(p.createdAt));                   //   " · 1시간 전"
      const subtitle = subtitleParts.join(' · ');

      const priceText =
        p.mode === 'donate'
          ? '나눔'
          : (typeof p.price === 'number'
              ? (p.price === 0 ? '나눔🩵' : `${Number(p.price).toLocaleString('ko-KR')}원`)  // ✅ 0 → 무료
              : '');
      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
      return (
        <MarketItem
          key={p.id}
          id={p.id}
          title={p.title}
          subtitle={subtitle}
          price={priceText}
          likeCount={p.likeCount ?? 0}
          image={image}
          onPress={onPressMarketItem}
        />
      );
    });
  };

  const renderLostList = () => {
    if (lostFavs.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>좋아요한 분실물이 없어요.</Text>
        </View>
      );
    }

    return lostFavs.map((p) => {
      // ✅ 위치 · 시간 순서로 표시
      const subtitleParts: string[] = [];
      if (p.location) subtitleParts.push(p.location);  // 예: "AI바이오융합대학"
      subtitleParts.push(timeAgo(p.createdAt));        // 예: "1시간 전"
      const subtitle = subtitleParts.join(' · ');

      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
      const typeLabel = p.type === 'lost' ? '분실' : p.type === 'found' ? '습득' : '분실';

      return (
        <LostItem
          key={p.id}
          title={p.title}
          subtitle={subtitle}              // ✅ 위치 반영된 subtitle
          typeLabel={typeLabel}
          likeCount={p.likeCount ?? 0}
          image={image}
          onPress={() => onPressLostItem(p.id)}
        />
      );
    });
  };


  const renderGroupList = () => {
    if (groupFavs.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>좋아요한 공동구매가 없어요.</Text>
        </View>
      );
    }
    return groupFavs.map((p) => {
      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
      const timeText = timeAgo(p.createdAt);
      const recruitMode = (p.recruit?.mode ?? 'unlimited') as 'unlimited' | 'limited';
      const recruitCount = p.recruit?.count ?? null;
      const closed = false; // 실제 필드가 생기면 교체
      return (
        <TouchableOpacity key={p.id} activeOpacity={1} onPress={() => onPressGroupItem(p.id)}>
          <GroupItem
            title={p.title}
            timeText={timeText}
            recruitMode={recruitMode}
            recruitCount={recruitCount}
            image={image}
            isClosed={closed}
            likeCount={p.likeCount ?? 0}
            onPress={() => onPressGroupItem(p.id)}
          />
        </TouchableOpacity>
      );
    });
  };

  const renderNoticeList = () => {
    if (noticeFavs.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>좋아요한 공지사항이 없어요.</Text>
        </View>
      );
    }
    return noticeFavs.map((p) => {
      const term = `${ymd(p.startDate ?? p.createdAt)} ~ ${ymd(p.endDate ?? p.startDate ?? p.createdAt)}`;
      const status = isClosed(p.endDate) ? 'closed' : 'open';
      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
      return (
        <NoticeItem
          key={p.id}
          id={p.id}
          title={p.title}
          termText={term}
          timeAgoText={timeAgo(p.createdAt ?? p.startDate)}
          status={status}
          image={image}
          onPress={onPressNoticeItem}
        />
      );
    });
  };

  // 활성 탭 콘텐츠
  const content = (() => {
    switch (activeTab) {
      case 'market': return renderMarketList();
      case 'lost':   return renderLostList();
      case 'group':  return renderGroupList();
      case 'notice': return renderNoticeList();
      default:       return null;
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onPressBack} activeOpacity={0.9}>
          <Image source={require('../../../assets/images/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>관심 목록</Text>
      </View>

      {/* 카테고리 탭 */}
      <CategoryTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />

      {/* 리스트 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {content}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
