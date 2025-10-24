import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import styles from './MemberListPage.styles';
import { getAdminUserInfo } from '../../../api/auth';

// ✅ 컬럼 고정폭(+ 간격)
const COL = {
  NAME_W: 70,
  SID_W: 90,
  DEPT_W: 120,
  NICK_W: 96,
  REPORT_W: 108,
  GAP: 12,
  GAP_D2N: 6,
};

// 가로 스크롤 총 너비
const TOTAL_WIDTH =
  COL.NAME_W + COL.GAP +
  COL.SID_W  + COL.GAP +
  COL.DEPT_W + COL.GAP_D2N +
  COL.NICK_W + COL.GAP +
  COL.REPORT_W;

type Member = {
  id: string;
  name: string;
  studentId: string;
  department: string;
  nickname: string;
  reportCount: number;
};

// 관리자 추정 필터(응답에 role/email이 없으므로 키워드 기반)
const isProbablyAdmin = (u: any) => {
  const keys = ['admin', '관리자'];
  const name = String(u?.name ?? '').trim().toLowerCase();
  const nick = String(u?.userNickname ?? '').trim().toLowerCase();
  const sid  = String(u?.studentId ?? '').trim().toLowerCase();
  return keys.includes(name) || keys.includes(nick) || keys.includes(sid);
};

export default function MemberListPage() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  // ===== 서버에서 회원 정보 불러오기 =====
  const load = useCallback(async () => {
    try {
      const { data } = await getAdminUserInfo(); // [{ id,name,userNickname,studentId,major,reportCount }]
      if (!Array.isArray(data)) {
        console.warn('[member list] Invalid response format');
        setMembers([]);
        return;
      }

      // ✅ 관리자 제외
      const onlyUsers = data.filter((u) => !isProbablyAdmin(u));

      // 이름순 정렬
      const sorted = onlyUsers.sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );

      // 매핑
      const mapped: Member[] = sorted.map((u) => ({
        id:
          u.studentId && String(u.studentId).trim().length > 0
            ? String(u.studentId)
            : String(u.id),
        name: u.name ?? '-',
        studentId:
          u.studentId && String(u.studentId).trim().length > 0
            ? String(u.studentId)
            : '-',
        department: u.major ?? '-',
        nickname: u.userNickname ?? '',
        reportCount: typeof u.reportCount === 'number' ? u.reportCount : 0,
      }));

      setMembers(mapped);
    } catch (e) {
      console.log('[member list] admin userInfo load error', e);
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  // 검색 필터
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.studentId || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q) ||
        (m.nickname || '').toLowerCase().includes(q)
    );
  }, [query, members]);

  const renderItem = ({ item }: { item: Member }) => (
    <View style={styles.itemRow}>
      <Text
        style={[styles.name, { width: COL.NAME_W, marginRight: COL.GAP }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.name}
      </Text>

      <Text
        style={[styles.studentId, { width: COL.SID_W, marginRight: COL.GAP }]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {item.studentId}
      </Text>

      <Text
        style={[styles.department, { width: COL.DEPT_W, marginRight: COL.GAP_D2N }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.department}
      </Text>

      <Text
        style={[styles.nickname, { width: COL.NICK_W, marginRight: COL.GAP }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.nickname}
      </Text>

      <Text
        style={[styles.report, { width: COL.REPORT_W }]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        신고 횟수 : {item.reportCount}번
      </Text>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
      >
        <View style={{ width: TOTAL_WIDTH }}>
          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
