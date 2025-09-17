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
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import styles from './MemberListPage.styles';

const USERS_ALL_KEY = 'users_all_v1';
const REPORTS_KEY   = 'reports_v1';
const ADMIN_EMAILS  = ['admin@yiu.ac.kr']; // 목록/삭제에서 제외
const BAN_THRESHOLD = 10;                   // 인정 10회 → 자동 탈퇴

// ✅ 컬럼 고정폭(+ 간격) — 네가 지정한 값 유지
const COL = {
  NAME_W: 70,     // 이름 5글자 감안
  SID_W: 90,      // 학번 기존 폭
  DEPT_W: 120,    // 학과 8글자
  NICK_W: 96,     // 닉네임 6글자
  REPORT_W: 108,  // "신고 횟수 : 0번"
  GAP: 12,        // 기본 컬럼 간격
  GAP_D2N: 6,     // 학과 ↔ 닉네임 사이만 더 좁게
};

// 가로 스크롤용 총 너비(패딩 제외)
const TOTAL_WIDTH =
  COL.NAME_W + COL.GAP +
  COL.SID_W  + COL.GAP +
  COL.DEPT_W + COL.GAP_D2N +
  COL.NICK_W + COL.GAP +
  COL.REPORT_W;

type StoredUser = {
  email: string;
  name: string;
  department: string;
  nickname: string;
  studentId?: string;
  isAdmin?: boolean;
  createdAt?: string;
};

type ReportType = '부적절한 콘텐츠' | '사기/스팸' | '욕설/혐오' | '기타';
type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type StoredReport = {
  id: string;
  target: {
    email?: string | null; // 가능하면 이메일 기준으로 카운트
    nickname?: string;
    dept?: string;
    label?: string;        // "닉네임 - 학과"
  };
  type: ReportType;
  content: string;
  images: string[];
  createdAt: string;       // ISO
  reporterEmail?: string | null;
  status?: ReportStatus;   // 관리자에서 처리 시 저장
};

type Member = {
  id: string; // studentId or email fallback
  email: string; // 매칭/탈퇴용
  name: string;
  studentId: string;
  department: string;
  nickname: string;
  reportCount: number; // ✅ 승인(인정)된 신고 횟수
};

export default function MemberListPage() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  // ====== 유틸: 이메일 정규화 ======
  const normalizeEmail = (v?: string | null) =>
    (v || '').trim().toLowerCase();

  // ====== 신고 카운트 집계 (APPROVED만) ======
  const buildApprovedCountMap = (reports: StoredReport[]) => {
    const map: Record<string, number> = {};
    for (const r of reports) {
      if ((r.status || 'PENDING') !== 'APPROVED') continue;
      const key = normalizeEmail(r.target?.email);
      if (!key) continue; // 안전하게: 이메일 있는 케이스만 집계/탈퇴 반영
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  };

  // ====== 로드 + 자동 탈퇴(정책 반영) ======
  const load = async () => {
    try {
      const [[, rawUsers], [, rawReports]] = await AsyncStorage.multiGet([
        USERS_ALL_KEY,
        REPORTS_KEY,
      ]);
      const users: StoredUser[] = rawUsers ? JSON.parse(rawUsers) : [];
      const reports: StoredReport[] = rawReports ? JSON.parse(rawReports) : [];

      // 승인(인정)된 신고 횟수 집계
      const approvedMap = buildApprovedCountMap(reports);

      // 관리자 제외 + 최신가입순 정렬
      const filtered = users
        .filter(u => !ADMIN_EMAILS.includes(normalizeEmail(u.email)))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      // ✅ 자동 탈퇴 후보: 승인횟수>=10인 이메일
      const bannedEmails = new Set(
        filtered
          .map(u => normalizeEmail(u.email))
          .filter(email => (approvedMap[email] || 0) >= BAN_THRESHOLD)
      );

      // ✅ 실제 users_all_v1에서 삭제(탈퇴 반영)
      let changed = false;
      const afterBan = users.filter(u => !bannedEmails.has(normalizeEmail(u.email)));
      if (afterBan.length !== users.length) {
        changed = true;
        await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(afterBan));
      }

      // 화면 표시는 삭제된 후의 목록 기준으로 다시 계산
      const baseList: StoredUser[] = changed ? afterBan : users;

      const final = baseList
        .filter(u => !ADMIN_EMAILS.includes(normalizeEmail(u.email)))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .map<Member>(u => ({
          id: u.studentId && u.studentId.length > 0 ? u.studentId : u.email,
          email: normalizeEmail(u.email),
          name: u.name || '이름없음',
          studentId: u.studentId || '-', // 아직 미입력 가능
          department: u.department || '-',
          nickname: u.nickname || '',
          reportCount: approvedMap[normalizeEmail(u.email)] || 0,
        }));

      setMembers(final);
    } catch (e) {
      console.log('member list load error', e);
      setMembers([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 닉네임 등 변경 / 신고 처리 후 복귀 시 갱신
  useFocusEffect(React.useCallback(() => {
    load();
  }, []));

  // ✅ 검색 대상: 학번, 이름, 학과, 닉네임
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
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

      {/* ===== 리스트: 가로 스크롤 + 세로 플랫리스트 ===== */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // 좌/우 패딩: 우측 여백을 줄이기 위해 8dp로 축소
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
