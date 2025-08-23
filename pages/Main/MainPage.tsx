// pages/Main/MainPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { DEFAULT_CATEGORIES } from '../../components/CategoryChips/CategoryChips';
import FloatingWriteButton from '../../components/FloatingButton/FloatingWriteButton';
import MainHeader from '../../components/Header/MainHeader';
import LostItem from '../../components/ListTile/LostItem/LostItem';
import MarketItem from '../../components/ListTile/MarketItem/MarketItem';
import styles from './MainPage.styles';

const POSTS_KEY_MAP = {
  market: 'market_posts_v1',
  lost: 'lost_found_posts_v1',
} as const;

type MarketListItem = {
  id: string;
  title: string;
  description?: string;
  mode: 'sell' | 'donate';
  price: number;          // number로 저장
  location: string;       // 칩 라벨과 동일 추천
  images: string[];
  likeCount: number;
  createdAt: string;      // ISO
};

type LostListItem = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string;      // ISO
};

/** 장소 → 카테고리 id 매핑 */
function getCategoryIdFromLocation(location: string): string {
  const hit = DEFAULT_CATEGORIES.find(c => c.label === location);
  return hit ? hit.id : 'all';
}

/** "1시간 전" 같은 상대시간 */
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

export default function MainPage({ navigation }: any) {
  const [category, setCategory] = useState<string>('all');
  const [tab, setTab] = useState<TabKey>('market');
  const [marketItems, setMarketItems] = useState<MarketListItem[]>([]);
  const [lostItems, setLostItems] = useState<LostListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleTabChange = (next: TabKey) => {
    setTab(next);
    if (next === 'chat') {
      navigation.replace('ChatList');
      return;
    }
  };

  /** 탭에 맞는 키로 로드하여 최신순 정렬 */
  const loadPosts = useCallback(async (which: TabKey) => {
    const key = POSTS_KEY_MAP[which as keyof typeof POSTS_KEY_MAP];
    if (!key) return;

    try {
      const raw = await AsyncStorage.getItem(key);
      const list = (raw ? JSON.parse(raw) : []) as any[];

      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (which === 'market') setMarketItems(list as MarketListItem[]);
      if (which === 'lost') setLostItems(list as LostListItem[]);
    } catch (e) {
      console.log('load posts error', e);
      if (which === 'market') setMarketItems([]);
      if (which === 'lost') setLostItems([]);
    }
  }, []);

  // 포커스되거나 탭이 바뀔 때마다 해당 탭 데이터 로드
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadPosts(tab);
      })();
    }, [tab, loadPosts])
  );

  /** Pull-to-Refresh */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(tab);
    setRefreshing(false);
  }, [tab, loadPosts]);

  /** 카테고리 필터 */
  const filteredMarket = useMemo(() => {
    if (category === 'all') return marketItems;
    return marketItems.filter(it => getCategoryIdFromLocation(it.location) === category);
  }, [marketItems, category]);

  const filteredLost = useMemo(() => {
    if (category === 'all') return lostItems;
    return lostItems.filter(it => getCategoryIdFromLocation(it.location) === category);
  }, [lostItems, category]);

  return (
    <View style={styles.container}>
      <MainHeader />

      {/* 카테고리 칩 */}
      <CategoryChips
        value={category}
        onChange={setCategory}
        items={DEFAULT_CATEGORIES}
        containerStyle={{ marginTop: 12, marginBottom: 8 }}
      />

      <View style={styles.content}>
        {/* 중고거래 탭 */}
        {tab === 'market' && (
          <FlatList
            data={filteredMarket}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MarketItem
                title={item.title}
                subtitle={`${item.location} · ${timeAgo(item.createdAt)}`}
                price={
                  item.mode === 'donate'
                    ? '나눔'
                    : `${item.price.toLocaleString('ko-KR')}원`
                }
                likeCount={item.likeCount ?? 0}
                image={item.images?.[0] ?? ''}
              />
            )}
            ListEmptyComponent={
              <Text style={{ color: '#979797', marginTop: 24, textAlign: 'center' }}>
                {category === 'all'
                  ? '아직 게시글이 없어요. 오른쪽 아래 버튼으로 첫 글을 올려보세요!'
                  : '이 카테고리에 해당하는 게시글이 없어요.'}
              </Text>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={6}
            windowSize={10}
            removeClippedSubviews
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

        {/* 분실물 탭 */}
        {tab === 'lost' && (
          <FlatList
            data={filteredLost}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LostItem
                title={item.title}
                subtitle={`${item.location} · ${timeAgo(item.createdAt)}`}
                typeLabel={item.type === 'found' ? '습득' : '분실'}
                likeCount={item.likeCount ?? 0}
                image={item.images?.[0] ?? ''}
              />
            )}
            ListEmptyComponent={
              <Text style={{ color: '#979797', marginTop: 24, textAlign: 'center' }}>
                {category === 'all'
                  ? '아직 분실물/습득물 게시글이 없어요.\n 오른쪽 아래 버튼으로 첫 글을 올려보세요!'
                  : '이 카테고리에 해당하는 게시글이 없어요.'}
              </Text>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={6}
            windowSize={10}
            removeClippedSubviews
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>

      <BottomTabBar value={tab} onChange={handleTabChange} />
      <FloatingWriteButton activeTab={tab} />
    </View>
  );
}
