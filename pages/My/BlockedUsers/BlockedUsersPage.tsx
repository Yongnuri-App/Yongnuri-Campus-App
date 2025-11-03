// pages/Settings/BlockedUsersPage.tsx
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import styles from './BlockedUsersPage.styles';

// ✅ 로컬 차단 유틸 (폴백/동기화용)
import {
  getBlockedUsers as getBlockedUsersLocal,
  unblockUser as unblockUserLocal,
  type BlockedUser as LocalBlockedUser,
} from '@/utils/blocked';

// ✅ 서버 API (누락되었던 import 보강)
import {
  getBlockedList,
  deleteBlockById,
  type BlockedRow,
} from '@/api/blocks';

type RowVM = {
  blockRecordId: string; // 서버 레코드 id (DELETE 경로에 사용)
  userId: string;        // 상대 사용자 id
  name: string;          // 표시용 닉네임
  avatarUri?: string;
  dept?: string;
};

export default function BlockedUsersPage() {
  const navigation = useNavigation<any>();

  const [rows, setRows] = useState<RowVM[]>([]);
  const [loading, setLoading] = useState(true);

  /** 서버 목록을 우선 로드, 실패 시 로컬 폴백 */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 1) 서버에서 조회
      const serverList = await getBlockedList();
      const vm = serverList.map<RowVM>((r: BlockedRow) => ({
        blockRecordId: String(r.id),   // ✅ 해제 시 필요
        userId: String(r.userId),
        name: r.nickName || '알 수 없음',
      }));
      setRows(vm);
    } catch (e) {
      console.log('getBlockedList error, fallback to local', e);
      // 2) 서버 실패 → 로컬에 저장된 목록으로 대체
      const local = await getBlockedUsersLocal();
      const vm = (local as LocalBlockedUser[]).map<RowVM>((u) => ({
        blockRecordId: '',            // 로컬에는 레코드 ID 개념이 없음
        userId: u.id,
        name: u.name,
        avatarUri: u.avatarUri,
        dept: u.dept,
      }));
      setRows(vm);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onPressBack = useCallback(() => navigation.goBack(), [navigation]);

  /** 서버 해제 → 로컬 동기화 → UI 제거 */
  const doUnblock = useCallback(async (row: RowVM) => {
    try {
      if (row.blockRecordId) {
        // 서버 레코드 id가 있으면 서버 우선 해제
        await deleteBlockById(row.blockRecordId);
      }
      // 서버 id가 없으면(로컬만 있는 경우) 서버 호출 생략
    } catch (e: any) {
      const status = e?.response?.status;
      if (status !== 404) {
        Alert.alert('오류', '차단 해제 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      // 404는 "이미 서버 기록 없음"으로 보고 계속 진행
    }

    // 로컬 저장소에서도 제거(양쪽 동기화)
    await unblockUserLocal(row.userId);
    setRows(prev => prev.filter(r => !(r.userId === row.userId)));
  }, []);

  const askUnblock = useCallback((row: RowVM) => {
    const run = () => void doUnblock(row);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `${row.name} 관리`,
          options: ['취소', '차단 해제'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        (idx) => { if (idx === 1) run(); }
      );
    } else {
      Alert.alert('관리', `${row.name} 차단을 해제할까요?`, [
        { text: '취소', style: 'cancel' },
        { text: '차단 해제', style: 'destructive', onPress: run },
      ]);
    }
  }, [doUnblock]);

  const renderRow = useCallback((row: RowVM) => {
    const avatar = row.avatarUri ? { uri: row.avatarUri } : null;

    return (
      <View key={`${row.blockRecordId}_${row.userId}`} style={styles.row}>
        {avatar ? (
          <Image source={avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Image
              source={require('../../../assets/images/yongnuri-icon-black.png')}
              style={styles.avatarIcon}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
          {!!row.dept && <Text style={styles.dept} numberOfLines={1}>{row.dept}</Text>}
        </View>

        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => askUnblock(row)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${row.name} 관리`}
        >
          <Text style={styles.manageText}>관리</Text>
        </TouchableOpacity>
      </View>
    );
  }, [askUnblock]);

  const content = useMemo(() => {
    if (loading) return <Text style={styles.muted}>불러오는 중…</Text>;
    if (rows.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>차단한 사용자가 없어요.</Text>
          <Text style={styles.emptySub}>
            채팅/게시글 화면에서 사용자 메뉴로 차단을 설정할 수 있어요.
          </Text>
        </View>
      );
    }
    return rows.map(renderRow);
  }, [loading, rows, renderRow]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 상태바 여백 */}
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onPressBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.9}
        >
          <Image
            source={require('../../../assets/images/back_white.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단한 사용자</Text>
      </View>

      {/* 리스트 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {content}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
