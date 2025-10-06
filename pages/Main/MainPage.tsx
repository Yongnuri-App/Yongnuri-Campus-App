import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { DEFAULT_CATEGORIES } from '../../components/CategoryChips/CategoryChips';
import FloatingWriteButton from '../../components/FloatingButton/FloatingWriteButton';
import MainHeader from '../../components/Header/MainHeader';
import GroupItem from '../../components/ListTile/GroupItem/GroupItem';
import LostItem from '../../components/ListTile/LostItem/LostItem';
import MarketItem from '../../components/ListTile/MarketItem/MarketItem';
import NoticeItem from '../../components/ListTile/NoticeItem/NoticeItem';
import { getIsAdmin } from '../../utils/auth';
import styles from './MainPage.styles';

import type { RootStackScreenProps } from '../../types/navigation';
import { getMarketList } from '../../api/market';
import { getLostFoundList } from '../../api/lost';

/** AsyncStorage 키 매핑 (탭별) */
const POSTS_KEY_MAP = {
  market: 'market_posts_v1',
  lost: 'lost_found_posts_v1',
  group: 'groupbuy_posts_v1',
  notice: 'notice_posts_v1',
} as const;

/** 중고거래 리스트 타입 */
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
  saleStatus?: '판매중' | '예약중' | '거래완료';
};

/** 분실물 리스트 타입 */
type LostListItem = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string;
  status?: 'REPORTED' | 'RETURNED' | 'DELETED';
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

/** 카테고리 id → 위치 라벨(API/클라이언트 필터용) */
function getLocationLabelFromId(id: string): string {
  if (id === 'all') return '전체';
  return DEFAULT_CATEGORIES.find(c => c.id === id)?.label ?? '전체';
}

/** 서버 status → 한글 배지 */
function mapStatusToBadge(
  s?: string
): '판매중' | '예약중' | '거래완료' | undefined {
  if (!s) return undefined;
  const up = String(s).toUpperCase();
  if (up === 'SELLING' || up === 'ON_SALE') return '판매중';
  if (up === 'RESERVED') return '예약중';
  if (up === 'SOLD' || up === 'SOLD_OUT') return '거래완료';
  return undefined;
}

/** "n분 전 / n시간 전 / n일 전" */
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

/** YYYY-MM-DD */
function formatDateYMD(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 공지 종료 여부 */
function isClosed(isoEnd: string) {
  return new Date(isoEnd).getTime() < Date.now();
}

export default function MainPage({ navigation, route }: RootStackScreenProps<'Main'>) {
  const [category, setCategory] = useState<string>('all');

  // 초기 탭
  const initialTabFromParam = (route?.params?.initialTab as TabKey | undefined) ?? 'market';
  const [tab, setTab] = useState<TabKey>(initialTabFromParam);

  const [marketItems, setMarketItems] = useState<MarketListItem[]>([]);
  const [lostItems, setLostItems] = useState<LostListItem[]>([]);
  const [groupItems, setGroupItems] = useState<GroupListItem[]>([]);
  const [noticeItems, setNoticeItems] = useState<NoticeListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 관리자 여부
  const [isAdmin, setIsAdmin] = useState(false);

  // 외부 reset 등으로 initialTab이 바뀌면 동기화
  useEffect(() => {
    const next = route?.params?.initialTab as TabKey | undefined;
    if (next && next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.initialTab]);

  // 최초 마운트 시 관리자 플래그 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const flag = await getIsAdmin();
        if (mounted) setIsAdmin(!!flag);
      } catch {
        if (mounted) setIsAdmin(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 포커스될 때마다 관리자 재확인
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      (async () => {
        try {
          const flag = await getIsAdmin();
          if (!canceled) setIsAdmin(!!flag);
        } catch {
          if (!canceled) setIsAdmin(false);
        }
      })();
      return () => { canceled = true; };
    }, [])
  );

  /** 탭 변경 핸들러 (채팅 탭은 별도 화면) */
  const handleTabChange = (next: TabKey) => {
    setTab(next);
    if (next === 'chat') {
      navigation.replace('ChatList');
      return;
    }
  };

  /** 탭별 포스트 로드 */
  const loadPosts = useCallback(
    async (which: TabKey, currentCategoryId?: string) => {
      // ----- 중고거래: 서버 목록 호출 -----
      if (which === 'market') {
        try {
          const typeLabel = getLocationLabelFromId(currentCategoryId ?? category);
          console.log('[MainPage] GET /board/market?type=', typeLabel);
          const data = await getMarketList(typeLabel);

          const list: MarketListItem[] = (Array.isArray(data) ? data : []).map((d: any) => {
            const id = String(d.post_id ?? d.id);
            const createdAt = d.created_at ?? d.createdAt ?? new Date().toISOString();
            const price = Number(d.price ?? 0);
            const mode: 'sell' | 'donate' = price === 0 ? 'donate' : 'sell';
            const thumb = d.thumbnailUrl || d.thumbnailURL || d.thumbnail || undefined;

            return {
              id,
              title: d.title ?? '',
              description: undefined,
              mode,
              price,
              location: d.location ?? '',
              images: thumb ? [thumb] : [],
              likeCount: Number(d.bookmarkCount ?? 0),
              createdAt,
              saleStatus: mapStatusToBadge(d.status),
            };
          });

          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMarketItems(list);
        } catch (e) {
          console.log('[MainPage] market list load error', (e as any)?.response?.data || e);
          setMarketItems([]);
        }
        return;
      }

      // ----- 분실물: 서버 목록 호출 + 클라이언트 보정 필터 -----
      if (which === 'lost') {
        try {
          const typeLabel = getLocationLabelFromId(currentCategoryId ?? category);
          console.log('[MainPage] GET /board/lost-found?location=', typeLabel);

          const data = await getLostFoundList(
            // 서버가 무시할 수 있지만, 보내는 건 유지
            typeLabel
          );

          // 서버 응답을 먼저 정규화
          let rows: any[] = Array.isArray(data) ? data : [];

          // ✅ 서버가 location 필터를 무시하는 경우를 대비해 클라이언트에서 한 번 더 필터링
          if (typeLabel && typeLabel !== '전체') {
            rows = rows.filter((d: any) => (d?.location ?? '').trim() === typeLabel);
          }

          const list: LostListItem[] = rows
            .filter(Boolean)
            .map((raw, idx) => {
              const d: any = raw ?? {};
              const id = String(d.post_id ?? d.id ?? `lost_${idx}`);
              const createdAt = d.created_at ?? d.createdAt ?? new Date().toISOString();
              const thumb = d.thumbnailUrl || d.thumbnailURL || d.thumbnail || undefined;

              return {
                id,
                title: d.title ?? '',
                content: '',
                location: d.location ?? '',
                type: (d.purpose === 'LOST' ? 'lost' : 'found') as 'lost' | 'found',
                images: thumb ? [thumb] : [],
                likeCount: Number(d.bookmarkCount ?? 0),
                createdAt,
                status: d.status as 'REPORTED' | 'RETURNED' | 'DELETED' | undefined,
              };
            });

          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // 서버가 빈 배열 주면 로컬 폴백
          if (!list.length) {
            try {
              const raw = await AsyncStorage.getItem('lost_found_posts_v1');
              const local: LostListItem[] = raw ? JSON.parse(raw) : [];
              // 폴백에도 같은 기준으로 필터 적용
              const filteredLocal =
                typeLabel && typeLabel !== '전체'
                  ? local.filter((it) => (it.location ?? '').trim() === typeLabel)
                  : local;
              setLostItems(filteredLocal);
            } catch {
              setLostItems([]);
            }
          } else {
            setLostItems(list);
          }
        } catch (e) {
          console.log('[MainPage] lost list load error', (e as any)?.response?.data || e);
          // 실패 시 로컬 폴백 (+ 동일 필터)
          try {
            const typeLabel = getLocationLabelFromId(currentCategoryId ?? category);
            const raw = await AsyncStorage.getItem('lost_found_posts_v1');
            const local: LostListItem[] = raw ? JSON.parse(raw) : [];
            const filteredLocal =
              typeLabel && typeLabel !== '전체'
                ? local.filter((it) => (it.location ?? '').trim() === typeLabel)
                : local;
            setLostItems(filteredLocal);
          } catch {
            setLostItems([]);
          }
        }
        return;
      }

      // ----- 나머지 탭은 기존 로컬 저장소 유지 -----
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

        if (which === 'group') setGroupItems(list as GroupListItem[]);
        if (which === 'notice') setNoticeItems(list as NoticeListItem[]);
      } catch (e) {
        console.log('load posts error', e);
        if (which === 'group') setGroupItems([]);
        if (which === 'notice') setNoticeItems([]);
      }
    },
    [category]
  );

  // 탭 포커스마다 재로딩
  useFocusEffect(
    useCallback(() => {
      (async () => { await loadPosts(tab); })();
    }, [tab, loadPosts])
  );

  // 당겨서 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(tab);
    setRefreshing(false);
  }, [tab, loadPosts]);

  /** 카테고리 바뀔 때 market/lost 재요청 */
  useEffect(() => {
    if (tab === 'market' || tab === 'lost') {
      (async () => { await loadPosts(tab, category); })();
    }
  }, [category, tab, loadPosts]);

  /** 필터링: market은 서버 필터, lost는 서버 + 클라이언트 보정 필터 */
  const filteredMarket = useMemo(() => marketItems, [marketItems]);
  const filteredLost = useMemo(() => lostItems, [lostItems]);
  const filteredGroup = useMemo(() => groupItems, [groupItems]);

  /** 상세 이동 */
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
                saleStatus={item.saleStatus}
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
            renderItem={({ item }) => {
              // 'RETURNED'면 회수, 그 외 목적에 따라 분실/습득
              const typeLabel =
                item.status === 'RETURNED' ? '회수' : (item.type === 'found' ? '습득' : '분실');

              return (
                <LostItem
                  title={item.title}
                  subtitle={`${item.location} · ${timeAgo(item.createdAt)}`}
                  typeLabel={typeLabel}
                  likeCount={item.likeCount ?? 0}
                  image={item.images && item.images.length > 0 ? item.images[0] : undefined}
                  onPress={() => navigation.navigate('LostDetail', { id: item.id })}
                />
              );
            }}
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

      {/* 글쓰기 버튼 노출 규칙: market/lost/group 항상, notice는 관리자만 */}
      {(((tab !== 'notice') as boolean) || (tab === 'notice' && isAdmin)) && (
        <FloatingWriteButton activeTab={tab} />
      )}
    </View>
  );
}
