import React, { useMemo, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CategoryTabs, { CategoryTab } from '../../../components/CategoryTabs/CategoryTabs';
import styles from './TradeHistoryPage.styles';

const TABS: CategoryTab[] = [
  { key: 'market', label: '중고거래' },
  { key: 'lost',   label: '분실물' },
  { key: 'group',  label: '공동구매' },
];

// 탭별 필터 옵션
const FILTERS_BY_TAB: Record<string, { key: string; label: string }[]> = {
  market: [
    { key: 'sell', label: '판매' },
    { key: 'buy',  label: '구매' },
  ],
  lost: [
    { key: 'found', label: '습득' },
    { key: 'lost',  label: '분실' },
  ],
  group: [
    { key: 'register', label: '등록' },
    { key: 'apply',    label: '신청' },
  ],
};

export default function TradeHistoryPage() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<string>('market');

  // 탭이 바뀌면 기본 필터(첫 번째)로 초기화
  const defaultFilter = FILTERS_BY_TAB[activeTab][0].key;
  const [filter, setFilter] = useState<string>(defaultFilter);

  // 탭 변경 시 필터도 리셋
  const onChangeTab = (next: string) => {
    setActiveTab(next);
    setFilter(FILTERS_BY_TAB[next][0].key);
  };

  const filtersForTab = useMemo(() => FILTERS_BY_TAB[activeTab] ?? [], [activeTab]);

  // 리스트는 채팅 연동 후 주입 예정 → 지금은 빈 상태 안내
  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>표시할 거래 내역이 없어요.</Text>
      <Text style={styles.emptySub}>
        {`${TABS.find(t => t.key === activeTab)?.label ?? ''} · ${
          filtersForTab.find(f => f.key === filter)?.label ?? ''
        }`}
      </Text>
    </View>
  );

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
      <CategoryTabs
        tabs={TABS}
        value={activeTab}
        onChange={onChangeTab}
      />

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

      {/* 리스트 (추후 채팅 연동 시 데이터 바인딩) */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
