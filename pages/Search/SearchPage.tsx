// pages/Search/SearchPage.tsx
import React, { useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import styles from './SearchPage.styles';

import MarketItem from '../../components/ListTile/MarketItem/MarketItem';
import LostItem from '../../components/ListTile/LostItem/LostItem';
import GroupItem from '../../components/ListTile/GroupItem/GroupItem';
import NoticeItem from '../../components/ListTile/NoticeItem/NoticeItem';
import { useUnifiedSearch, Unified } from '../../hooks/useUnifiedSearch';

type Props = { navigation: any };

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
function ymd(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function isClosed(endIso?: string) {
  return endIso ? new Date(endIso).getTime() < Date.now() : false;
}

export default function SearchPage({ navigation }: Props) {
  const {
    keyword, setKeyword,
    recent, loadingRecents,
    results, loadingResults,
    runSearch, refreshResults,
    removeRecentOne, clearRecentAll,
  } = useUnifiedSearch();

  useFocusEffect(
    useCallback(() => {
      refreshResults();
    }, [refreshResults])
  );

  const canSearch = keyword.trim().length > 0;

  const onSubmit = () => {
    if (!canSearch) return;
    Keyboard.dismiss();
    runSearch(keyword).catch(() => {
      Alert.alert('오류', '검색 중 문제가 발생했습니다.');
    });
  };

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

    if (item.kind === 'group') {
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
    }

    // notice
    const it = item.data;
    const term = `${ymd(it.startDate ?? it.createdAt)} ~ ${ymd(it.endDate ?? it.startDate ?? it.createdAt)}`;
    const status = isClosed(it.endDate) ? 'closed' : 'open';

    return (
      <NoticeItem
        id={it.id}
        title={it.title}
        termText={term}
        timeAgoText={timeAgo(it.createdAt ?? it.startDate)}
        status={status}
        image={it.images?.[0]}
        onPress={(id) => navigation.navigate('NoticeDetail', { id })}
        bottomTag="공지사항" // ✅ 중고거래와 동일 위치/디자인
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
          style={styles.input}
          placeholder="검색어를 입력해주세요."
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />

        <TouchableOpacity onPress={onSubmit} activeOpacity={canSearch ? 0.7 : 1}>
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
            <TouchableOpacity
              onPress={async () => {
                if (recent.length === 0) return;
                // 페이지에서만 Confirm 처리
                Alert.alert('최근 검색어 삭제', '전체 삭제하시겠어요?', [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => clearRecentAll() },
                ]);
              }}
            >
              <Text style={styles.deleteAll}>전체 삭제</Text>
            </TouchableOpacity>
          </View>

          {loadingRecents ? null : recent.length === 0 ? (
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
                      runSearch(item).catch(() => {
                        Alert.alert('오류', '검색 중 문제가 발생했습니다.');
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keywordText}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentOne(item)}>
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
