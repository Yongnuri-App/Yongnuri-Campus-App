// pages/My/TradeHistory/TradeHistoryPage.tsx
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import groupRepo, { type GroupPost } from '../../../repositories/posts/asyncStorage/GroupRepo';
import lostRepo, { type LostPost } from '../../../repositories/posts/asyncStorage/LostRepo';
import marketRepo, { type MarketPost } from '../../../repositories/posts/asyncStorage/MarketRepo';
import { getLocalIdentity } from '../../../utils/localIdentity';

// ✅ '거래완료' 스냅샷 저장소(구매 내역은 여기서 읽어옴)
import marketTradeRepo, { type MarketTradeRecord } from '../../../repositories/trades/MarketTradeRepo';

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
  const [lostMine, setLostMine]           = useState<LostPost[]>([]);
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

  // ----------------------- DEBUG 0-A 시작 -----------------------
  // 구매 탭일 때, 현재 사용자의 식별자(이메일/ID)가 무엇인지 확인 로그
  useEffect(() => {
    if (isMarketBuy) {
      console.log('[BUY TAB] getLocalIdentity => myEmail, myId =', myEmail, myId);
      // 참고: 둘 다 비어있으면 구매 탭 필터가 작동 안 하므로 로그인/세션 확인 필요
    }
  }, [isMarketBuy, myEmail, myId]);
  // ----------------------- DEBUG 0-A 끝 -------------------------

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
      console.warn('TradeHistory market sell load error:', e);
      setMarketMine([]);
    } finally { setLoading(false); }
  }, [isMarketSell, myEmail, myId]);

  /** ✅ 중고거래: 내가 '구매'한 거래완료 목록(구매 탭) — marketTradeRepo에서 조회 */
  const loadMarketBought = useCallback(async () => {
    if (!isMarketBuy) return;
    setLoading(true);
    try {
      const list = await marketTradeRepo.listByBuyer({
        buyerEmail: myEmail,
        buyerId: myId,
      });
      // trade 스냅샷은 이미 createdAt(거래완료 시각) 기준으로 정렬 저장됨
      setMarketBought(list);
    } catch (e) {
      console.warn('TradeHistory market buy load error:', e);
      setMarketBought([]);
    } finally { setLoading(false); }
  }, [isMarketBuy, myEmail, myId]);

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
      // 다른 탭 데이터 비우기
      setLostMine([]); setGroupMine([]);
      return;
    }

    if (isLost) {
      loadLostMine();
      setMarketMine([]); setMarketBought([]); setGroupMine([]);
      return;
    }

    if (isGroup) {
      if (isGroupRegister) loadGroupMine(); else setGroupMine([]); // 신청은 비움
      setMarketMine([]); setMarketBought([]); setLostMine([]);
      return;
    }

    // 기타 방어적 초기화
    setMarketMine([]); setMarketBought([]); setLostMine([]); setGroupMine([]);
  }, [
    activeTab, filter,
    isMarketSell, isMarketBuy, isLost, isGroup, isGroupRegister,
    loadMarketMine, loadMarketBought, loadLostMine, loadGroupMine,
  ]);

  /** 화면 복귀 시 갱신 (탭/필터 유지한 채 최신화) */
  useFocusEffect(
    useCallback(() => {
      if (isMarketSell) loadMarketMine();
      if (isMarketBuy)  loadMarketBought();
      if (isLost)       loadLostMine();
      if (isGroupRegister) loadGroupMine();
    }, [isMarketSell, isMarketBuy, isLost, isGroupRegister, loadMarketMine, loadMarketBought, loadLostMine, loadGroupMine])
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

  // 네비게이션 헬퍼
  const goMarketDetail = (id: string) => navigation.navigate('MarketDetail', { id });
  const goLostDetail   = (id: string) => navigation.navigate('LostDetail', { id });
  const goGroupDetail  = (id: string) => navigation.navigate('GroupBuyDetail', { id });

  // 중고거래/판매 렌더러 (내가 올린 글)
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

  // ✅ 중고거래/구매 렌더러 (거래완료 스냅샷)
  const renderBoughtItem = ({ item }: { item: MarketTradeRecord }) => {
    const subtitle = `거래완료 · ${timeAgo(item.createdAt)}`;
    return (
      <MarketItem
        id={item.postId} // 상세는 원글 id로 진입
        title={item.title}
        subtitle={subtitle}
        price={item.price != null ? toKPrice(item.price) : '가격없음'}
        likeCount={0}
        image={item.image}
        saleStatus={'거래완료'}
        onPress={goMarketDetail}
      />
    );
  };

  // 분실물 렌더러
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
