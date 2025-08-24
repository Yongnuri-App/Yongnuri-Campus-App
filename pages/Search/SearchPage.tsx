// pages/Search/SearchPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; // ✅ 추가
import styles from './SearchPage.styles';

import MarketItem from '../../components/ListTile/MarketItem/MarketItem';
import LostItem from '../../components/ListTile/LostItem/LostItem';
import GroupItem from '../../components/ListTile/GroupItem/GroupItem';

type Props = { navigation: any };

const STORAGE_KEY = 'recent_keywords';
const MAX_RECENTS = 15;

const MARKET_KEY = 'market_posts_v1';
const LOST_KEY = 'lost_found_posts_v1';
const GROUP_KEY = 'groupbuy_posts_v1';

type Unified =
  | { kind: 'market'; id: string; data: any }
  | { kind: 'lost'; id: string; data: any }
  | { kind: 'group'; id: string; data: any };

export default function SearchPage({ navigation }: Props) {
  const [keyword, setKeyword] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);

  const [results, setResults] = useState<Unified[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const lastQueryRef = useRef<string>(''); // ✅ 마지막 검색어 기억

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setRecent(parsed);
        }
      } catch (e) {
        console.log('최근 검색어 로드 실패:', e);
      } finally {
        setLoadingRecents(false);
      }
    })();
  }, []);

  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

  const persistRecent = async (list: string[]) => {
    setRecent(list);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.log('최근 검색어 저장 실패:', e);
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    return `${d}일 전`;
  };

  // ✅ 화면 복귀 시 현재 lastQuery로 최신 스토리지 기준 재검색(최근검색어는 건드리지 않음)
  const refreshResults = useCallback(async () => {
    const q = normalize(lastQueryRef.current);
    if (!q) return;
    try {
      const [mRaw, lRaw, gRaw] = await Promise.all([
        AsyncStorage.getItem(MARKET_KEY),
        AsyncStorage.getItem(LOST_KEY),
        AsyncStorage.getItem(GROUP_KEY),
      ]);

      const markets = (mRaw ? JSON.parse(mRaw) : []) as any[];
      const losts = (lRaw ? JSON.parse(lRaw) : []) as any[];
      const groups = (gRaw ? JSON.parse(gRaw) : []) as any[];

      const qLower = q.toLowerCase();

      const hitMarket: Unified[] = markets
        .filter((it) => (`${it.title ?? ''} ${it.description ?? ''}`).toLowerCase().includes(qLower))
        .map((it) => ({ kind: 'market', id: it.id, data: it }));

      const hitLost: Unified[] = losts
        .filter((it) => (`${it.title ?? ''} ${it.content ?? ''}`).toLowerCase().includes(qLower))
        .map((it) => ({ kind: 'lost', id: it.id, data: it }));

      const hitGroup: Unified[] = groups
        .filter((it) => (`${it.title ?? ''} ${it.description ?? ''}`).toLowerCase().includes(qLower))
        .map((it) => ({ kind: 'group', id: it.id, data: it }));

      const merged = [...hitMarket, ...hitLost, ...hitGroup].sort((a, b) => {
        const ta = new Date(a.data.createdAt ?? 0).getTime();
        const tb = new Date(b.data.createdAt ?? 0).getTime();
        return tb - ta;
      });

      setResults(merged);
    } catch (e) {
      console.log('검색 새로고침 실패:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 상세에서 돌아왔을 때 카운트/상태가 바뀌었으면 반영
      refreshResults();
    }, [refreshResults])
  );

  const runSearch = useCallback(async (raw: string) => {
    const q = normalize(raw);
    if (!q) return;
    Keyboard.dismiss();
    lastQueryRef.current = q; // ✅ 마지막 검색어 저장

    const next = [q, ...recent.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(
      0,
      MAX_RECENTS
    );
    persistRecent(next);

    setLoadingResults(true);
    try {
      const [mRaw, lRaw, gRaw] = await Promise.all([
        AsyncStorage.getItem(MARKET_KEY),
        AsyncStorage.getItem(LOST_KEY),
        AsyncStorage.getItem(GROUP_KEY),
      ]);

      const markets = (mRaw ? JSON.parse(mRaw) : []) as any[];
      const losts = (lRaw ? JSON.parse(lRaw) : []) as any[];
      const groups = (gRaw ? JSON.parse(gRaw) : []) as any[];

      const qLower = q.toLowerCase();

      const hitMarket: Unified[] = markets
        .filter((it) => (`${it.title ?? ''} ${it.description ?? ''}`).toLowerCase().includes(qLower))
        .map((it) => ({ kind: 'market', id: it.id, data: it }));

      const hitLost: Unified[] = losts
        .filter((it) => (`${it.title ?? ''} ${it.content ?? ''}`).toLowerCase().includes(qLower))
        .map((it) => ({ kind: 'lost', id: it.id, data: it }));

      const hitGroup: Unified[] = groups
        .filter((it) => (`${it.title ?? ''} ${it.description ?? ''}`).toLowerCase().includes(qLower))
        .map((it) => ({ kind: 'group', id: it.id, data: it }));

      const merged = [...hitMarket, ...hitLost, ...hitGroup].sort((a, b) => {
        const ta = new Date(a.data.createdAt ?? 0).getTime();
        const tb = new Date(b.data.createdAt ?? 0).getTime();
        return tb - ta;
      });

      setResults(merged);
    } catch (e) {
      console.log('검색 실패:', e);
      Alert.alert('오류', '검색 중 문제가 발생했습니다.');
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, [recent]);

  const removeOne = (word: string) => {
    const next = recent.filter((r) => r !== word);
    persistRecent(next);
  };

  const clearKeywords = () => {
    if (recent.length === 0) return;
    Alert.alert('최근 검색어 삭제', '전체 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => persistRecent([]) },
    ]);
  };

  const canSearch = useMemo(() => normalize(keyword).length > 0, [keyword]);

  const renderResult = ({ item }: { item: Unified }) => {
    if (item.kind === 'market') {
      const it = item.data;
      return (
        <MarketItem
          id={it.id}
          title={it.title}
          subtitle={`${it.location} · ${timeAgo(it.createdAt)}`}
          price={it.mode === 'donate' ? '나눔' : `${Number(it.price || 0).toLocaleString('ko-KR')}원`}
          likeCount={it.likeCount ?? 0}
          image={it.images && it.images.length > 0 ? it.images[0] : undefined}
          onPress={(id) => navigation.navigate('MarketDetail', { id })}
          bottomTag="중고거래"
        />
      );
    }

    if (item.kind === 'lost') {
      const it = item.data;
      return (
        <LostItem
          title={it.title}
          subtitle={`${it.location} · ${timeAgo(it.createdAt)}`}
          typeLabel={it.type === 'found' ? '습득' : '분실'}
          likeCount={it.likeCount ?? 0}
          image={it.images && it.images.length > 0 ? it.images[0] : undefined}
          onPress={() => navigation.navigate('LostDetail', { id: it.id })}
          bottomTag="분실물"
        />
      );
    }

    const it = item.data;
    return (
      <GroupItem
        title={it.title}
        timeText={timeAgo(it.createdAt)}
        recruitMode={(it.recruit?.mode ?? 'unlimited') as 'unlimited' | 'limited'}
        recruitCount={it.recruit?.count ?? null}
        image={it.images && it.images.length > 0 ? it.images[0] : undefined}
        isClosed={!!it.isClosed}
        onPress={() => navigation.navigate('GroupBuyDetail', { id: it.id })}
        bottomTag="공동구매"
        likeCount={it.likeCount ?? 0}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* 상단 검색바 */}
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../../assets/images/back.png')}
            style={styles.iconBack}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="검색어를 입력해주세요."
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (canSearch) runSearch(keyword);
          }}
        />

        <TouchableOpacity
          onPress={() => canSearch && runSearch(keyword)}
          activeOpacity={canSearch ? 0.7 : 1}
        >
          <Image
            source={require('../../assets/images/search.png')}
            style={styles.iconSearch}
          />
        </TouchableOpacity>
      </View>

      {/* 최근 검색어 / 검색 결과 */}
      {results.length === 0 ? (
        <>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>최근 검색어</Text>
            <TouchableOpacity onPress={clearKeywords}>
              <Text style={styles.deleteAll}>전체 삭제</Text>
            </TouchableOpacity>
          </View>

          {loadingRecents ? (
            <FlatList data={[]} keyExtractor={(_, i) => i.toString()} renderItem={() => null} />
          ) : recent.length === 0 ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#999' }}>최근 검색어가 없습니다.</Text>
            </View>
          ) : (
            <FlatList
              data={recent}
              keyExtractor={(item, index) => `${item}-${index}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.keywordRow}>
                  <Image
                    source={require('../../assets/images/time.png')}
                    style={styles.iconTime}
                  />
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      setKeyword(item);
                      runSearch(item);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keywordText}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeOne(item)}>
                    <Image
                      source={require('../../assets/images/delete.png')}
                      style={styles.iconDelete}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(it) => `${it.kind}-${it.id}`}
          renderItem={renderResult}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={{ paddingLeft: 8, paddingTop: 5, paddingBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                검색 결과 ({results.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            !loadingResults ? (
              <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
                <Text style={{ color: '#999' }}>검색 결과가 없습니다.</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
