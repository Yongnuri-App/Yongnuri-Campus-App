// pages/Main/MainPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { DEFAULT_CATEGORIES } from '../../components/CategoryChips/CategoryChips';
import FloatingWriteButton from '../../components/FloatingButton/FloatingWriteButton';
import MainHeader from '../../components/Header/MainHeader';
import LostItem from '../../components/ListTile/LostItem/LostItem';
import MarketItem from '../../components/ListTile/MarketItem/MarketItem';
import GroupItem from '../../components/ListTile/GroupItem/GroupItem';
import NoticeItem from '../../components/ListTile/NoticeItem/NoticeItem';
import styles from './MainPage.styles';

import type { RootStackScreenProps } from '../../types/navigation';

const POSTS_KEY_MAP = {
  market: 'market_posts_v1',
  lost: 'lost_found_posts_v1',
  group: 'groupbuy_posts_v1',
  notice: 'notice_posts_v1',
} as const;

type MarketListItem = {
  id: string;
  title: string;
  description?: string;
  mode: 'sell' | 'donate';
  price: number;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string;
};

type LostListItem = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string;
};

type GroupListItem = {
  id: string;
  title: string;
  description?: string;
  recruit: {
    mode: 'unlimited' | 'limited' | null;
    count: number | null;
  };
  applyLink: string;
  images: string[];
  likeCount: number;
  createdAt: string;
};

type NoticeListItem = {
  id: string;
  title: string;
  description?: string;
  images?: string[];
  startDate: string;  // ISO
  endDate: string;    // ISO
  createdAt: string;  // ISO
};

function getCategoryIdFromLocation(location: string): string {
  const hit = DEFAULT_CATEGORIES.find(c => c.label === location);
  return hit ? hit.id : 'all';
}

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

function formatDateYMD(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isClosed(isoEnd: string) {
  return new Date(isoEnd).getTime() < Date.now();
}

export default function MainPage({ navigation, route }: RootStackScreenProps<'Main'>) {
  const [category, setCategory] = useState<string>('all');

  // 초기 탭: 파라미터 있으면 사용, 없으면 market
  const initialTabFromParam = (route?.params?.initialTab as TabKey | undefined) ?? 'market';
  const [tab, setTab] = useState<TabKey>(initialTabFromParam);

  const [marketItems, setMarketItems] = useState<MarketListItem[]>([]);
  const [lostItems, setLostItems] = useState<LostListItem[]>([]);
  const [groupItems, setGroupItems] = useState<GroupListItem[]>([]);
  const [noticeItems, setNoticeItems] = useState<NoticeListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 외부 reset 등으로 initialTab이 바뀌면 동기화
  useEffect(() => {
    const next = route?.params?.initialTab as TabKey | undefined;
    if (next && next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.initialTab]);

  const handleTabChange = (next: TabKey) => {
    setTab(next);
    if (next === 'chat') {
      navigation.replace('ChatList');
      return;
    }
  };

  const loadPosts = useCallback(async (which: TabKey) => {
    const key = POSTS_KEY_MAP[which as keyof typeof POSTS_KEY_MAP];
    if (!key) return;

    try {
      const raw = await AsyncStorage.getItem(key);
      const list = (raw ? JSON.parse(raw) : []) as any[];

      list.sort(
        (a, b) =>
          new Date(b.createdAt ?? b.startDate).getTime() -
          new Date(a.createdAt ?? a.startDate).getTime()
      );

      if (which === 'market') setMarketItems(list as MarketListItem[]);
      if (which === 'lost') setLostItems(list as LostListItem[]);
      if (which === 'group') setGroupItems(list as GroupListItem[]);
      if (which === 'notice') setNoticeItems(list as NoticeListItem[]);
    } catch (e) {
      console.log('load posts error', e);
      if (which === 'market') setMarketItems([]);
      if (which === 'lost') setLostItems([]);
      if (which === 'group') setGroupItems([]);
      if (which === 'notice') setNoticeItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadPosts(tab);
      })();
    }, [tab, loadPosts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(tab);
    setRefreshing(false);
  }, [tab, loadPosts]);

  const filteredMarket = useMemo(() => {
    if (category === 'all') return marketItems;
    return marketItems.filter(it => getCategoryIdFromLocation(it.location) === category);
  }, [marketItems, category]);

  const filteredLost = useMemo(() => {
    if (category === 'all') return lostItems;
    return lostItems.filter(it => getCategoryIdFromLocation(it.location) === category);
  }, [lostItems, category]);

  const filteredGroup = useMemo(() => groupItems, [groupItems]);

  const handlePressMarketItem = useCallback((id: string) => {
    navigation.navigate('MarketDetail', { id });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <MainHeader />

      {/* 카테고리 칩: 공지/그룹은 숨김 */}
      {tab !== 'group' && tab !== 'notice' && (
        <CategoryChips
          value={category}
          onChange={setCategory}
          items={DEFAULT_CATEGORIES}
          containerStyle={{ marginTop: 12, marginBottom: 8 }}
        />
      )}

      <View style={styles.content}>
        {tab === 'market' && (
          <FlatList
            data={filteredMarket}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MarketItem
                id={item.id}
                title={item.title}
                subtitle={`${item.location} · ${timeAgo(item.createdAt)}`}
                price={item.mode === 'donate' ? '나눔' : `${item.price.toLocaleString('ko-KR')}원`}
                likeCount={item.likeCount ?? 0}
                image={item.images && item.images.length > 0 ? item.images[0] : undefined}
                onPress={handlePressMarketItem}
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}

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
                image={item.images && item.images.length > 0 ? item.images[0] : undefined}
                onPress={() => navigation.navigate('LostDetail', { id: item.id })}
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}

        {tab === 'group' && (
          <FlatList
            data={filteredGroup}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GroupItem
                title={item.title}
                timeText={timeAgo(item.createdAt)}
                recruitMode={item.recruit?.mode === 'limited' ? 'limited' : 'unlimited'}
                recruitCount={item.recruit?.count ?? null}
                image={item.images && item.images.length > 0 ? item.images[0] : undefined}
                likeCount={item.likeCount ?? 0}
                onPress={() => navigation.navigate('GroupBuyDetail', { id: item.id })}
              />
            )}
            ListEmptyComponent={
              <Text style={{ color: '#979797', marginTop: 24, textAlign: 'center' }}>
                공동구매 모집글이 없어요. 오른쪽 아래 버튼으로 첫 글을 올려보세요!
              </Text>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={6}
            windowSize={10}
            removeClippedSubviews
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}

        {tab === 'notice' && (
          <FlatList
            data={noticeItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NoticeItem
                id={item.id}
                title={item.title}
                termText={`${formatDateYMD(item.startDate)} ~ ${formatDateYMD(item.endDate)}`}
                timeAgoText={timeAgo(item.createdAt ?? item.startDate)}
                status={isClosed(item.endDate) ? 'closed' : 'open'}
                image={item.images?.[0]}
                onPress={() => {
                  // ✅ 다른 탭들과 동일하게 바로 상세로 이동
                  navigation.navigate('NoticeDetail', { id: item.id });
                }}
              />
            )}
            ListEmptyComponent={
              <Text style={{ color: '#979797', marginTop: 24, textAlign: 'center' }}>
                공지사항이 아직 없어요.
              </Text>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            initialNumToRender={6}
            windowSize={10}
            removeClippedSubviews
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}

        {tab !== 'market' && tab !== 'lost' && tab !== 'group' && tab !== 'notice' && (
          <View>
            <Text style={{ color: '#979797', textAlign: 'center', marginTop: 24 }}>
              해당 탭의 리스트는 준비 중입니다.
            </Text>
          </View>
        )}
      </View>

      <BottomTabBar value={tab} onChange={handleTabChange} />
      {tab !== 'notice' && <FloatingWriteButton activeTab={tab} />}
    </View>
  );
}
