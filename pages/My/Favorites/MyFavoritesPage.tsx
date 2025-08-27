import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CategoryTabs, { CategoryTab } from '../../../components/CategoryTabs/CategoryTabs';
import MarketItem from '../../../components/ListTile/MarketItem/MarketItem';
import LostItem from '../../../components/ListTile/LostItem/LostItem';
import GroupItem from '../../../components/ListTile/GroupItem/GroupItem';
import styles from './MyFavoritesPage.styles';

/* ✅ 저장소 키 (프로젝트 기존 키와 일치) */
const MARKET_POSTS_KEY = 'market_posts_v1';
const MARKET_LIKED_MAP_KEY = 'market_liked_map_v1';

const LOST_POSTS_KEY = 'lost_found_posts_v1';
const LOST_LIKED_MAP_KEY = 'lost_found_liked_map_v1';

const GROUP_POSTS_KEY = 'groupbuy_posts_v1';
const GROUP_LIKED_MAP_KEY = 'groupbuy_liked_map_v1';

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
  authorDept?: string;
};

type LostPost = {
  id: string;
  title: string;
  type: 'lost' | 'found';
  createdAt: string; // ISO
  images: string[];
  likeCount: number;
  authorDept?: string;
};

type RecruitMode = 'unlimited' | 'limited' | null;
type GroupBuyPost = {
  id: string;
  title: string;
  description: string;
  recruit: {
    mode: RecruitMode;
    count: number | null;
  };
  applyLink: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorDept?: string;
};

const TABS: CategoryTab[] = [
  { key: 'market', label: '중고거래' },
  { key: 'lost',   label: '분실물' },
  { key: 'group',  label: '공동구매' },
  { key: 'notice', label: '공지사항' },
];

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

export default function MyFavoritesPage() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<string>('market');

  // 관심목록 상태
  const [marketFavs, setMarketFavs] = useState<MarketPost[]>([]);
  const [lostFavs, setLostFavs] = useState<LostPost[]>([]);
  const [groupFavs, setGroupFavs] = useState<GroupBuyPost[]>([]);

  /* ===== 로더들 ===== */
  const loadMarketFavorites = useCallback(async () => {
    try {
      const [rawPosts, rawLikedMap] = await Promise.all([
        AsyncStorage.getItem(MARKET_POSTS_KEY),
        AsyncStorage.getItem(MARKET_LIKED_MAP_KEY),
      ]);
      const posts: MarketPost[] = rawPosts ? JSON.parse(rawPosts) : [];
      const likedMap: Record<string, boolean> = rawLikedMap ? JSON.parse(rawLikedMap) : {};
      setMarketFavs(posts.filter(p => likedMap[p.id]));
    } catch (e) {
      console.log('load market favorites error', e);
      setMarketFavs([]);
    }
  }, []);

  const loadLostFavorites = useCallback(async () => {
    try {
      const [rawPosts, rawLikedMap] = await Promise.all([
        AsyncStorage.getItem(LOST_POSTS_KEY),
        AsyncStorage.getItem(LOST_LIKED_MAP_KEY),
      ]);
      const posts: LostPost[] = rawPosts ? JSON.parse(rawPosts) : [];
      const likedMap: Record<string, boolean> = rawLikedMap ? JSON.parse(rawLikedMap) : {};
      setLostFavs(posts.filter(p => likedMap[p.id]));
    } catch (e) {
      console.log('load lost favorites error', e);
      setLostFavs([]);
    }
  }, []);

  const loadGroupFavorites = useCallback(async () => {
    try {
      const [rawPosts, rawLikedMap] = await Promise.all([
        AsyncStorage.getItem(GROUP_POSTS_KEY),
        AsyncStorage.getItem(GROUP_LIKED_MAP_KEY),
      ]);
      const posts: GroupBuyPost[] = rawPosts ? JSON.parse(rawPosts) : [];
      const likedMap: Record<string, boolean> = rawLikedMap ? JSON.parse(rawLikedMap) : {};
      setGroupFavs(posts.filter(p => likedMap[p.id]));
    } catch (e) {
      console.log('load group favorites error', e);
      setGroupFavs([]);
    }
  }, []);

  /* 포커스 복귀 시 탭별 로딩 */
  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'market') loadMarketFavorites();
      if (activeTab === 'lost')   loadLostFavorites();
      if (activeTab === 'group')  loadGroupFavorites();
    }, [activeTab, loadMarketFavorites, loadLostFavorites, loadGroupFavorites])
  );

  /* 최초 진입/탭 변경 시 로딩 */
  useEffect(() => {
    if (activeTab === 'market') loadMarketFavorites();
    if (activeTab === 'lost')   loadLostFavorites();
    if (activeTab === 'group')  loadGroupFavorites();
  }, [activeTab, loadMarketFavorites, loadLostFavorites, loadGroupFavorites]);

  /* ===== 네비게이션 핸들러 ===== */
  const onPressBack = () => navigation.goBack();
  const onPressMarketItem = (id: string) => navigation.navigate('MarketDetail', { id });
  const onPressLostItem = (id: string) => navigation.navigate('LostDetail', { id });
  const onPressGroupItem = (id: string) => navigation.navigate('GroupBuyDetail', { id });

  /* ===== 렌더러들 ===== */
  const renderMarketList = () => {
    if (marketFavs.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>좋아요한 중고거래가 없어요.</Text>
        </View>
      );
    }
    return marketFavs.map((p) => {
      const subtitle = `${p.authorDept ?? 'AI학부'} · ${timeAgo(p.createdAt)}`;
      const price =
        p.mode === 'donate' ? '나눔' : `₩ ${Number(p.price ?? 0).toLocaleString('ko-KR')}`;
      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
      return (
        <MarketItem
          key={p.id}
          id={p.id}
          title={p.title}
          subtitle={subtitle}
          price={price}
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
      const subtitle = `${p.authorDept ?? '무도대학'} · ${timeAgo(p.createdAt)}`;
      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
      const typeLabel = p.type === 'lost' ? '분실' : '습득';
      return (
        <LostItem
          key={p.id}
          title={p.title}
          subtitle={subtitle}
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
      const isClosed = false; // 실제 필드 생기면 교체
      return (
        <TouchableOpacity key={p.id} activeOpacity={1} onPress={() => onPressGroupItem(p.id)}>
          <GroupItem
            title={p.title}
            timeText={timeText}
            recruitMode={recruitMode}
            recruitCount={recruitCount}
            image={image}
            isClosed={isClosed}
            likeCount={p.likeCount ?? 0}
            onPress={() => onPressGroupItem(p.id)}
          />
        </TouchableOpacity>
      );
    });
  };

  // 🔧 useMemo 없이 즉시 실행 함수로 콘텐츠 결정 → 훅 의존성 경고 제거
  const content = (() => {
    switch (activeTab) {
      case 'market':
        return renderMarketList();
      case 'lost':
        return renderLostList();
      case 'group':
        return renderGroupList();
      case 'notice':
        return (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>공지사항 관심 항목이 없어요.</Text>
          </View>
        );
      default:
        return null;
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onPressBack} activeOpacity={0.9}>
          <Image
            source={require('../../../assets/images/back.png')}
            style={styles.backIcon}
          />
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
