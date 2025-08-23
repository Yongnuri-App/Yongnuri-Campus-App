// src/screens/SearchPage/SearchPage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import styles from './SearchPage.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = { navigation: any };

const STORAGE_KEY = 'recent_keywords';
const MAX_RECENTS = 15;

export default function SearchPage({ navigation }: Props) {
  const [keyword, setKeyword] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<TextInput>(null);

  // ---- 초기 로드: 로컬(AsyncStorage)에서 최근 검색어 가져오기 ----
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
        setLoading(false);
      }
    })();
  }, []);

  // ---- 저장 유틸 ----
  const persistRecent = async (list: string[]) => {
    setRecent(list);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.log('최근 검색어 저장 실패:', e);
    }
  };

  // ---- 정규화 유틸: 앞뒤 공백 제거, 연속 공백 통일 ----
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

  // ---- 검색 실행(아직 API 전 단계: 최근어 갱신 + 로그) ----
  const runSearch = (raw: string) => {
    const q = normalize(raw);
    if (!q) return;

    // 키보드 닫기
    Keyboard.dismiss();

    // 최근 검색어: 중복 제거하고 맨 앞으로
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(
      0,
      MAX_RECENTS
    );
    persistRecent(next);

    // 👉 실제로는 여기서 API 호출하거나 검색결과 화면으로 이동
    // navigation.navigate('SearchResult', { query: q });
    console.log('검색 실행:', q);
  };

  // ---- 단건 삭제 ----
  const removeOne = (word: string) => {
    const next = recent.filter((r) => r !== word);
    persistRecent(next);
  };

  // ---- 전체 삭제 ----
  const clearKeywords = () => {
    if (recent.length === 0) return;
    Alert.alert('최근 검색어 삭제', '전체 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => persistRecent([]),
      },
    ]);
  };

  // ---- 검색 버튼 활성화 여부 ----
  const canSearch = useMemo(() => normalize(keyword).length > 0, [keyword]);

  return (
    <View style={styles.container}>
      {/* 상단 검색바 영역 (구조/스타일 유지) */}
      <View style={styles.searchBar}>
        {/* 뒤로가기 버튼 */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../../assets/images/back.png')}
            style={styles.iconBack}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* 검색 입력창 */}
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
          // autoFocus={true} // 필요하면 주석 해제
        />

        {/* 검색 버튼 */}
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

      {/* 최근 검색어 헤더 */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>최근 검색어</Text>
        <TouchableOpacity onPress={clearKeywords}>
          <Text style={styles.deleteAll}>전체 삭제</Text>
        </TouchableOpacity>
      </View>

      {/* 최근 검색어 리스트 (구조/스타일 유지) */}
      {loading ? (
        // 로딩 중엔 조용히 빈 리스트처럼(스켈레톤/스피너는 UI 변형될 수 있어 생략)
        <FlatList
          data={[]}
          keyExtractor={(_, i) => i.toString()}
          renderItem={() => null}
        />
      ) : recent.length === 0 ? (
        // 빈 상태: 스타일은 건드리지 않고 동일 컨테이너에서 텍스트만 노출
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
              {/* 키워드 탭: 입력창으로 채우고 바로 검색 */}
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

              {/* 단건 삭제 */}
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
    </View>
  );
}
