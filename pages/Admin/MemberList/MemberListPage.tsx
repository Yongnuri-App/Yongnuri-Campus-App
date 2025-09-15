// pages/Admin/MemberList/MemberListPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import styles from './MemberListPage.styles';

const USERS_ALL_KEY = 'users_all_v1';
const ADMIN_EMAILS = ['admin@yiu.ac.kr']; // 목록에서 제외

type StoredUser = {
  email: string;
  name: string;
  department: string;
  nickname: string;
  studentId?: string;
  isAdmin?: boolean;
  createdAt?: string;
};

type Member = {
  id: string; // studentId or email fallback
  name: string;
  studentId: string;
  department: string;
  nickname: string;
  reportCount: number; // 현재 0 고정
};

export default function MemberListPage() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
      const users: StoredUser[] = raw ? JSON.parse(raw) : [];

      // 관리자 제외 + 최신가입순 정렬
      const filtered = users
        .filter(u => !ADMIN_EMAILS.includes(u.email?.toLowerCase?.() || ''))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      const mapped: Member[] = filtered.map(u => ({
        id: u.studentId && u.studentId.length > 0 ? u.studentId : u.email,
        name: u.name || '이름없음',
        studentId: u.studentId || '-', // 아직 미입력 가능
        department: u.department || '-',
        nickname: u.nickname || '',
        reportCount: 0,
      }));
      setMembers(mapped);
    } catch (e) {
      console.log('member list load error', e);
      setMembers([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 닉네임 등 변경 후 돌아오면 갱신
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return members;
    return members.filter(m => m.name.includes(q) || m.studentId.includes(q));
  }, [query, members]);

  const renderItem = ({ item }: { item: Member }) => (
    <View style={styles.itemRow}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.studentId}>{item.studentId}</Text>
      <Text style={styles.department}>{item.department}</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.nickname}>{item.nickname}</Text>
      <Text style={styles.report}>신고 횟수 : {item.reportCount}번</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image
            source={require('../../../assets/images/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원 정보</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 검색 */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="찾으시는 회원의 학번 또는 이름을 입력해주세요.."
          placeholderTextColor="#A6A6A6"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <Image
          source={require('../../../assets/images/search.png')}
          style={styles.searchIcon}
          resizeMode="contain"
        />
      </View>

      {/* 리스트 */}
      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
