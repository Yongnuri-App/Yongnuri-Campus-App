// pages/My/TradeHistory/TradeHistoryPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import CategoryTabs, { CategoryTab } from '../../../components/CategoryTabs/CategoryTabs';
import MarketItem from '../../../components/ListTile/MarketItem/MarketItem';
import LostItem from '../../../components/ListTile/LostItem/LostItem';
import GroupItem from '../../../components/ListTile/GroupItem/GroupItem';
import styles from './TradeHistoryPage.styles';

// ✅ Repo & Identity
import marketRepo, { type MarketPost } from '../../../repositories/posts/asyncStorage/MarketRepo';
import lostRepo,   { type LostPost   } from '../../../repositories/posts/asyncStorage/LostRepo';
import groupRepo,  { type GroupPost  } from '../../../repositories/posts/asyncStorage/GroupRepo';
import { getLocalIdentity } from '../../../utils/localIdentity';

const TABS: CategoryTab[] = [
  { key: 'market', label: '중고거래' },
  { key: 'lost',   label: '분실물' },
  { key: 'group',  label: '공동구매' },
];

const FILTERS_BY_TAB: Record<string, { key: string; label: string }[]> = {
  market: [
    { key: 'sell', label: '판매' },
    { key: 'buy',  label: '구매' },
  ],
  lost: [
    { key: 'found',     label: '습득' },
    { key: 'lost',      label: '분실' },
    { key: 'retrieved', label: '회수' }, // (추후 데이터 연동 예정)
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

function toKPrice(price?: number | string): string {
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

  const [activeTab, setActiveTab] = useState<string>('market');
  const defaultFilter = FILTERS_BY_TAB[activeTab][0].key;
  const [filter, setFilter] = useState<string>(defaultFilter);

  const [loading, setLoading] = useState(false);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const [marketMine, setMarketMine]   = useState<MarketPost[]>([]);
  const [lostMine, setLostMine]       = useState<LostPost[]>([]);
  const [groupMine, setGroupMine]     = useState<GroupPost[]>([]);

  const filtersForTab = useMemo(() => FILTERS_BY_TAB[activeTab] ?? [], [activeTab]);

  const isMarketSell     = activeTab === 'market' && filter === 'sell';
  const isLost           = activeTab === 'lost';
  const isLostFound      = isLost && filter === 'found';
  const isLostLost       = isLost && filter === 'lost';
  const isLostRetrieved  = isLost && filter === 'retrieved'; // 빈 상태
  const isGroup          = activeTab === 'group';
  const isGroupRegister  = isGroup && filter === 'register';
  const isGroupApply     = isGroup && filter === 'apply';     // 빈 상태

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

  /** 중고거래: 내 글만 */
  const loadMarketMine = useCallback(async () => {
    if (!isMarketSell) return;
    setLoading(true);
    try {
      const all = await marketRepo.list();
      const mine = (all || []).filter((p: MarketPost) => {
        const authorEmailNorm = normEmail(p.authorEmail ?? null);
        if (authorEmailNorm && myEmail) return sameEmail(authorEmailNorm, myEmail);
        if (!authorEmailNorm && !myEmail) return sameId(p.authorId ?? null, myId ?? null);
        return false;
      });
      mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMarketMine(mine);
    } catch (e) {
      console.warn('TradeHistory market load error:', e);
      setMarketMine([]);
    } finally { setLoading(false); }
  }, [isMarketSell, myEmail, myId]);

  /** 분실물: 내 글만 + type 필터 */
  const loadLostMine = useCallback(async () => {
    if (!isLost) return;
    setLoading(true);
    try {
      if (isLostRetrieved) { setLostMine([]); return; } // 회수: 아직 미구현

      const all = await lostRepo.list();
      const mine = (all || []).filter((p: LostPost) => {
        const authorEmailNorm = normEmail(p.authorEmail ?? null);
        if (authorEmailNorm && myEmail) return sameEmail(authorEmailNorm, myEmail);
        if (!authorEmailNorm && !myEmail) return sameId(p.authorId ?? null, myId ?? null);
        return false;
      });

      const filtered = mine.filter(p =>
        (isLostFound && p.type === 'found') || (isLostLost && p.type === 'lost')
      );

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLostMine(filtered);
    } catch (e) {
      console.warn('TradeHistory lost load error:', e);
      setLostMine([]);
    } finally { setLoading(false); }
  }, [isLost, isLostFound, isLostLost, isLostRetrieved, myEmail, myId]);

  /** 공동구매: 내가 등록한 글만 (등록 칩 전용) */
  const loadGroupMine = useCallback(async () => {
    if (!isGroupRegister) return;        // 신청 탭은 아직 미구현 → 빈 상태
    setLoading(true);
    try {
      const all = await groupRepo.list();
      const mine = (all || []).filter((p: GroupPost) => {
        const authorEmailNorm = normEmail(p.authorEmail ?? null);
        if (authorEmailNorm && myEmail) return sameEmail(authorEmailNorm, myEmail);
        if (!authorEmailNorm && !myEmail) return sameId(p.authorId ?? null, myId ?? null);
        return false;
      });
      mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setGroupMine(mine);
    } catch (e) {
      console.warn('TradeHistory group load error:', e);
      setGroupMine([]);
    } finally { setLoading(false); }
  }, [isGroupRegister, myEmail, myId]);

  /** 최초 로드 */
  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  /** 탭/필터 변경에 반응 */
  useEffect(() => {
    if (isMarketSell) {
      loadMarketMine();
      setLostMine([]); setGroupMine([]);
    } else if (isLost) {
      loadLostMine();
      setMarketMine([]); setGroupMine([]);
    } else if (isGroup) {
      if (isGroupRegister) loadGroupMine(); else setGroupMine([]); // 신청은 비움
      setMarketMine([]); setLostMine([]);
    } else {
      setMarketMine([]); setLostMine([]); setGroupMine([]);
    }
  }, [isMarketSell, isLost, isGroup, isGroupRegister, filter, loadMarketMine, loadLostMine, loadGroupMine]);

  /** 화면 복귀 시 갱신 */
  useFocusEffect(
    useCallback(() => {
      if (isMarketSell) loadMarketMine();
      if (isLost) loadLostMine();
      if (isGroupRegister) loadGroupMine();
    }, [isMarketSell, isLost, isGroupRegister, loadMarketMine, loadLostMine, loadGroupMine])
  );

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

  const goMarketDetail = (id: string) => navigation.navigate('MarketDetail', { id });
  const goLostDetail   = (id: string) => navigation.navigate('LostDetail', { id });
  const goGroupDetail  = (id: string) => navigation.navigate('GroupBuyDetail', { id });

  const renderMarketItem = ({ item }: { item: MarketPost }) => {
    const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined;
    const saleStatus = mapSaleStatus(item as any);
    const subtitle = `${timeAgo(item.createdAt)}`;
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

  const renderLostItem = ({ item }: { item: LostPost }) => {
    const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined;
    const subtitle = `${timeAgo(item.createdAt)}`;
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

  const renderContent = () => {
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
    if (isLost) {
      if (isLostRetrieved) return <EmptyState />; // 회수: 현재 비워둠
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
    if (isGroup) {
      if (isGroupApply) return <EmptyState />; // 신청: 추후 구매자 내역 연결
      // 등록
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
