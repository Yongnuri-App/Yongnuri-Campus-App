// pages/My/TradeHistory/TradeHistoryPage.tsx
// -------------------------------------------------------------------
// ✅ 변경 요약
// - "분실물 › 회수" 칩: 내 계정(ownerEmail === myEmail) 기준으로만 노출
// - tradeHistoryStore의 getRecoveredLostItemsByOwner 사용
// - 이벤트 채널명을 훅 상수(EVT_TRADE_HISTORY_UPDATED)로 통일
// -------------------------------------------------------------------

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CategoryTabs, { CategoryTab } from '../../../components/CategoryTabs/CategoryTabs';
import GroupItem from '../../../components/ListTile/GroupItem/GroupItem';
import LostItem from '../../../components/ListTile/LostItem/LostItem';
import MarketItem from '../../../components/ListTile/MarketItem/MarketItem';
import styles from './TradeHistoryPage.styles';

// ✅ Repo & Identity
// import groupRepo, { type GroupPost } from '../../../repositories/posts/asyncStorage/GroupRepo';
// import lostRepo, { type LostPost } from '../../../repositories/posts/asyncStorage/LostRepo';
// import marketRepo, { type MarketPost } from '../../../repositories/posts/asyncStorage/MarketRepo';
import { getLocalIdentity } from '../../../utils/localIdentity';

// ✅ '거래완료' 스냅샷 저장소(구매 내역은 여기서 읽어옴)
// import marketTradeRepo, { type MarketTradeRecord } from '../../../repositories/trades/MarketTradeRepo';

// ✅ 회수 칩 데이터(로컬 TradeHistory 저장소) – 오너 기준 필터 사용
import {
  type RecoveredLostItem
} from '../../../storage/tradeHistoryStore';

// 백엔드 API + 매퍼
import {
  fetchGroupBuyHistory,
  fetchLostItemHistory,
  fetchUsedItemHistory,
  mapGroupHistory,
  mapLostHistory,
  mapUsedItemToMarketPost,
  mapUsedItemToTradeRecords,
  type GroupPost,
  type LostPost,
  type MarketPost,
  type MarketTradeRecord,
} from '../../../api/history';

// ✅ 이벤트 채널 상수 (useLostClose에서 export)
import { EVT_TRADE_HISTORY_UPDATED } from '../../../hooks/useLostClose';

const TABS: CategoryTab[] = [
  { key: 'market', label: '중고거래' },
  { key: 'lost',   label: '분실물' },
  { key: 'group',  label: '공동구매' },
];

const FILTERS_BY_TAB: Record<string, { key: string; label: string }[]> = {
  market: [
    { key: 'sell', label: '판매' },
    { key: 'buy',  label: '구매' }, // ✅ 구매 탭: marketTradeRepo에서 조회
  ],
  lost: [
    { key: 'found',     label: '습득' },
    { key: 'lost',      label: '분실' },
    { key: 'retrieved', label: '회수' }, // ✅ 이제 구현됨 (로컬 tradeHistoryStore 사용)
  ],
  group: [
    { key: 'register', label: '등록' },
    { key: 'apply',    label: '신청' },  // (추후 구매자 내역)
  ],
};

/* ---------- 유틸 ---------- */
const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();
const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && normEmail(a) === normEmail(b);
const sameId = (a?: string | number | null, b?: string | number | null) =>
  a != null && b != null && String(a) === String(b);

function toKPrice(price?: number | string | null): string {
  if (price === undefined || price === null || price === '') return '가격없음';
  const n = typeof price === 'string' ? Number(price) : price;
  if (!Number.isFinite(n)) return String(price);
  if (n >= 10000) {
    const man = Math.floor(n / 10000);
    const rest = n % 10000;
    return rest ? `${man}만 ${rest.toLocaleString()}원` : `${man}만원`;
  }
  return `${n.toLocaleString()}원`;
}
function mapSaleStatus(_s?: any): '판매중' | '예약중' | '거래완료' {
  if (_s === 'RESERVED' || _s === '예약중' || _s === 'reserved') return '예약중';
  if (_s === 'SOLD' || _s === '거래완료' || _s === 'done') return '거래완료';
  return '판매중';
}
function timeAgo(ts?: string | number): string {
  if (!ts) return '';
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  if (!t) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

/* ---------- 컴포넌트 ---------- */
export default function TradeHistoryPage() {
  const navigation = useNavigation<any>();

  // 상단 탭/필터 상태
  const [activeTab, setActiveTab] = useState<string>('market');
  const defaultFilter = FILTERS_BY_TAB[activeTab][0].key;
  const [filter, setFilter] = useState<string>(defaultFilter);

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  // 각 탭별 데이터 상태
  const [marketMine, setMarketMine]       = useState<MarketPost[]>([]);           // 중고거래/판매(내 글)
  const [marketBought, setMarketBought]   = useState<MarketTradeRecord[]>([]);    // 중고거래/구매(거래완료 스냅샷)
  const [lostMine, setLostMine]           = useState<LostPost[]>([]);             // 분실/습득(내 글)
  const [lostRecovered, setLostRecovered] = useState<RecoveredLostItem[]>([]);    // ✅ 분실물/회수(로컬, 오너 기준)

  const [groupMine, setGroupMine]         = useState<GroupPost[]>([]);

  const filtersForTab = useMemo(() => FILTERS_BY_TAB[activeTab] ?? [], [activeTab]);

  // 탭/필터 플래그
  const isMarketSell     = activeTab === 'market' && filter === 'sell';
  const isMarketBuy      = activeTab === 'market' && filter === 'buy';
  const isLost           = activeTab === 'lost';
  const isLostFound      = isLost && filter === 'found';
  const isLostLost       = isLost && filter === 'lost';
  const isLostRetrieved  = isLost && filter === 'retrieved';
  const isGroup          = activeTab === 'group';
  const isGroupRegister  = isGroup && filter === 'register';
  const isGroupApply     = isGroup && filter === 'apply';

  const onChangeTab = (next: string) => {
    setActiveTab(next);
    setFilter(FILTERS_BY_TAB[next][0].key);
  };

  /** 내 계정(이메일/ID) 로드 */
  const loadIdentity = useCallback(async () => {
    const { userId, userEmail } = await getLocalIdentity();
    setMyId(userId);
    setMyEmail(userEmail ? normEmail(userEmail) : null);
  }, []);

  /** 중고거래: 내가 쓴 글(판매 탭) */
  const loadMarketMine = useCallback(async () => {
    if (!isMarketSell) return;
    setLoading(true);
    try {
      const rows = await fetchUsedItemHistory('sell');
      console.log('[history sell first]', rows?.[0]); // 어떤 키들로 오는지 확인
      const mine = mapUsedItemToMarketPost(rows);
      // 최신순 정렬(서버가 내려주면 생략 가능)
      mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMarketMine(mine);
    } catch (e) {
      console.warn('TradeHistory market sell load error:', e);
      setMarketMine([]);
    } finally { setLoading(false); }
  }, [isMarketSell]);

  /** ✅ 중고거래: 내가 '구매'한 거래완료 목록(구매 탭) — marketTradeRepo에서 조회 */
  const loadMarketBought = useCallback(async () => {
    if (!isMarketBuy) return;
    setLoading(true);
    try {
      const rows = await fetchUsedItemHistory('buy');
      const list = mapUsedItemToTradeRecords(rows);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMarketBought(list);
    } catch (e) {
      console.warn('TradeHistory market buy load error:', e);
      setMarketBought([]);
    } finally { setLoading(false); }
  }, [isMarketBuy]);

  /** 분실물: 내 글만 + type 필터 (회수 제외) */
  const loadLostMine = useCallback(async () => {
    if (!isLost || isLostRetrieved) return; // 회수는 별도 로더
    setLoading(true);
    try {
      // 현재 UI filter 키: 'found' | 'lost' | 'retrieved'
      const filterKey = isLostFound ? 'found' : 'lost';
      const rows = await fetchLostItemHistory(filterKey as 'found' | 'lost');
      const list = mapLostHistory(rows);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLostMine(list);
    } catch (e) {
      console.warn('TradeHistory lost load error:', e);
      setLostMine([]);
    } finally { setLoading(false); }
  }, [isLost, isLostFound, isLostRetrieved]);

  /** ✅ 분실물: 회수 칩 데이터 로드 (오너 이메일 기준 필터) */
  const loadLostRecovered = useCallback(async () => {
    if (!isLostRetrieved) return;
    setLoading(true);
    try {
      const rows = await fetchLostItemHistory('returned'); // ✅ UI 'retrieved' → API 'returned' 매핑
      const list = mapLostHistory(rows);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLostRecovered(
        list.map((r) => ({
          // 기존 LostItem 렌더러에 맞춰 최소 필드만 사용
          recordId: r.id,                 // key
          postId: r.id,                   // 상세 이동용 (id 동일 가정)
          title: r.title,
          image: (r.images ?? [])[0],
          recoveredAt: r.createdAt,
          ownerEmail: myEmail ?? undefined // 서버가 자동으로 본인 기준 필터링하므로 정보성으로만 둠
        }))
      );
    } catch (e) {
      console.warn('TradeHistory lost recovered load error:', e);
      setLostRecovered([]);
    } finally { setLoading(false); }
  }, [isLostRetrieved, myEmail]);

  /** 공동구매: 내가 등록한 글만 (등록 칩 전용) */
  const loadGroupMine = useCallback(async () => {
    if (!isGroupRegister) return;
    setLoading(true);
    try {
      const rows = await fetchGroupBuyHistory('registered');
      const mine = mapGroupHistory(rows);
      mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setGroupMine(mine);
    } catch (e) {
      console.warn('TradeHistory group load error:', e);
      setGroupMine([]);
    } finally { setLoading(false); }
  }, [isGroupRegister]);

  /** 최초 로드: 내 계정 식별자 저장 */
  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  /** 탭/필터 변경에 반응하여 각 목록 로드 */
  useEffect(() => {
    if (activeTab === 'market') {
      if (isMarketSell) {
        loadMarketMine();
        setMarketBought([]);
      } else if (isMarketBuy) {
        loadMarketBought();
        setMarketMine([]);
      }
      setLostMine([]); setLostRecovered([]); setGroupMine([]);
      return;
    }

    if (isLost) {
      if (isLostRetrieved) {
        loadLostRecovered();
        setLostMine([]); // 회수와 분실/습득은 UI 구분
      } else {
        loadLostMine();
        setLostRecovered([]);
      }
      setMarketMine([]); setMarketBought([]); setGroupMine([]);
      return;
    }

    if (isGroup) {
      if (isGroupRegister) loadGroupMine(); else setGroupMine([]);
      setMarketMine([]); setMarketBought([]); setLostMine([]); setLostRecovered([]);
      return;
    }

    // 방어적 초기화
    setMarketMine([]); setMarketBought([]); setLostMine([]); setLostRecovered([]); setGroupMine([]);
  }, [
    activeTab, filter,
    isMarketSell, isMarketBuy, isLost, isLostRetrieved, isGroup, isGroupRegister,
    loadMarketMine, loadMarketBought, loadLostMine, loadLostRecovered, loadGroupMine,
  ]);

  /** 화면 복귀 시 갱신 (탭/필터 유지한 채 최신화) */
  useFocusEffect(
    useCallback(() => {
      if (isMarketSell) loadMarketMine();
      if (isMarketBuy)  loadMarketBought();
      if (isLostRetrieved) loadLostRecovered();
      else if (isLost)  loadLostMine();
      if (isGroupRegister) loadGroupMine();
    }, [isMarketSell, isMarketBuy, isLost, isLostRetrieved, isGroupRegister, loadMarketMine, loadMarketBought, loadLostMine, loadLostRecovered, loadGroupMine])
  );

  /** ✅ 회수 처리 직후, ChatRoom에서 쏘는 이벤트로 실시간 갱신 */
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EVT_TRADE_HISTORY_UPDATED, async (payload) => {
      // payload.scope === 'lost-recovered' 로 구분 가능하지만
      // 현재 화면의 탭/필터에 맞춰 필요한 목록만 리로드
      if (isLostRetrieved) await loadLostRecovered();
      if (isLost && !isLostRetrieved) await loadLostMine();
      if (isMarketBuy) await loadMarketBought();
      if (isMarketSell) await loadMarketMine();
      if (isGroupRegister) await loadGroupMine();
    });
    return () => sub.remove();
  }, [isLost, isLostRetrieved, isMarketBuy, isMarketSell, isGroupRegister, loadLostRecovered, loadLostMine, loadMarketBought, loadMarketMine, loadGroupMine]);

  /* ---------- UI ---------- */
  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>
        {loading ? '불러오는 중…' : (myEmail || myId ? '표시할 거래 내역이 없어요.' : '로그인 정보가 없어요.')}
      </Text>
      {!loading && (myEmail || myId) && (
        <Text style={styles.emptySub}>
          {`${TABS.find(t => t.key === activeTab)?.label ?? ''} · ${
            filtersForTab.find(f => f.key === filter)?.label ?? ''
          }`}
        </Text>
      )}
    </View>
  );

  // 네비게이션 헬퍼
  const goMarketDetail = (id: string) => navigation.navigate('MarketDetail', { id });
  const goLostDetail   = (id: string) => navigation.navigate('LostDetail', { id });
  const goGroupDetail  = (id: string) => navigation.navigate('GroupBuyDetail', { id });

  // 중고거래/판매 렌더러 (내가 올린 글)
  const renderMarketItem = ({ item }: { item: MarketPost }) => {
    const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined;
    const saleStatus = mapSaleStatus(item as any);
    const subtitle = item.locationLabel
      ? `${item.locationLabel} · ${timeAgo(item.createdAt)}`
      : `${timeAgo(item.createdAt)}`;
    return (
      <MarketItem
        id={item.id}
        title={item.title}
        subtitle={subtitle}
        price={item.mode === 'donate' ? '나눔' : toKPrice(item.price)}
        likeCount={item.likeCount ?? 0}
        image={firstImage}
        saleStatus={saleStatus}
        onPress={goMarketDetail}
      />
    );
  };

  // ✅ 중고거래/구매 렌더러 (거래완료 스냅샷)
  const renderBoughtItem = ({ item }: { item: MarketTradeRecord }) => {
    const subtitle = item.locationLabel
      ? `거래완료 · ${item.locationLabel} · ${timeAgo(item.createdAt)}`
      : `거래완료 · ${timeAgo(item.createdAt)}`;

    return (
      <MarketItem
        id={item.postId}
        title={item.title}
        subtitle={subtitle}
        price={item.mode === 'donate' ? '나눔' : (item.price != null ? toKPrice(item.price) : '가격없음')}
        likeCount={0}
        image={item.image}
        saleStatus={'거래완료'}
        onPress={goMarketDetail}
      />
    );
  };

  // 분실물 렌더러 (분실/습득)
  const renderLostItem = ({ item }: { item: LostPost }) => {
    const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined;
    const subtitle = item.locationLabel
      ? `${item.locationLabel} · ${timeAgo(item.createdAt)}`
      : `${timeAgo(item.createdAt)}`;
    return (
      <LostItem
        title={item.title}
        subtitle={subtitle}
        typeLabel={item.type === 'lost' ? '분실' : '습득'}
        likeCount={item.likeCount ?? 0}
        image={firstImage}
        onPress={() => goLostDetail(item.id)}
      />
    );
  };

  // ✅ 분실물/회수 렌더러 (RecoveredLostItem → LostItem에 매핑)
  const renderRecoveredItem = ({ item }: { item: RecoveredLostItem }) => {
    const subtitle = `회수 · ${timeAgo(item.recoveredAt)}`;
    return (
      <LostItem
        title={item.title}
        subtitle={subtitle}
        typeLabel={'회수'}
        likeCount={0}
        image={item.image}
        onPress={() => item.postId && goLostDetail(item.postId)}
      />
    );
  };

  // 공동구매 렌더러
  const renderGroupItem = ({ item }: { item: GroupPost }) => {
    const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined;
    const timeText = timeAgo(item.createdAt);
    const mode = item.recruit?.mode === 'limited' ? 'limited' : 'unlimited';
    const count = item.recruit?.count ?? null;
    return (
      <GroupItem
        title={item.title}
        timeText={timeText}
        recruitMode={mode}
        recruitCount={count}
        image={firstImage}
        likeCount={item.likeCount ?? 0}
        onPress={() => goGroupDetail(item.id)}
      />
    );
  };

  // 컨텐츠 스위치
  const renderContent = () => {
    // 중고거래
    if (activeTab === 'market') {
      if (isMarketSell) {
        return marketMine.length === 0 ? <EmptyState /> : (
          <FlatList
            data={marketMine}
            keyExtractor={(it) => it.id}
            renderItem={renderMarketItem}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      }
      if (isMarketBuy) {
        return marketBought.length === 0 ? <EmptyState /> : (
          <FlatList
            data={marketBought}
            keyExtractor={(it) => it.id} // trade-id (postId__buyerKey)
            renderItem={renderBoughtItem}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      }
    }

    // 분실물
    if (isLost) {
      if (isLostRetrieved) {
        // ✅ 회수 칩 컨텐츠(내 계정 기준)
        return lostRecovered.length === 0 ? <EmptyState /> : (
          <FlatList
            data={lostRecovered}
            keyExtractor={(it) => (it.recordId ?? `${it.postId}__${(it.ownerEmail ?? '').toLowerCase()}`)}
            renderItem={renderRecoveredItem}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      }
      // 분실/습득
      return lostMine.length === 0 ? <EmptyState /> : (
        <FlatList
          data={lostMine}
          keyExtractor={(it) => it.id}
          renderItem={renderLostItem}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    // 공동구매
    if (isGroup) {
      if (isGroupApply) return <EmptyState />; // 신청: 추후 구매자 내역 연결
      return groupMine.length === 0 ? <EmptyState /> : (
        <FlatList
          data={groupMine}
          keyExtractor={(it) => it.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return <EmptyState />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 상태바 높이 */}
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.9}
        >
          <Image source={require('../../../assets/images/back_white.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>거래 내역</Text>
      </View>

      {/* 상단 카테고리 탭 (3개) */}
      <CategoryTabs tabs={TABS} value={activeTab} onChange={onChangeTab} />

      {/* 탭별 필터 칩 */}
      <View style={styles.chipRow}>
        {filtersForTab.map((f) => {
          const active = f.key === filter;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${f.label} 필터`}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}
