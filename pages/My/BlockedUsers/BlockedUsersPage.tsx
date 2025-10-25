// pages/Settings/BlockedUsersPage.tsx
// -------------------------------------------------------------
// 차단한 사용자 목록을 조회/해제하는 화면
// - 저장/조회 로직은 utils/blocked.ts 유틸을 사용하도록 정리
// - iOS: ActionSheet, Android: Alert로 "해제" 동작 확인
// - 스타일은 BlockedUsersPage.styles.ts로 분리 (기존 파일 그대로 사용)
// -------------------------------------------------------------

import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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

// ✅ 스타일 분리 (기존 파일 유지)
import styles from './BlockedUsersPage.styles';

// ✅ 차단 유틸 (공용)
// - BlockedUser 타입과 목록 로드/해제 함수를 가져옵니다.
import { getBlockedUsers, unblockUser, type BlockedUser } from '@/utils/blocked';

export default function BlockedUsersPage() {
  const navigation = useNavigation<any>();

  // 차단한 사용자 목록 상태
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  /** 목록 새로고침 (초기 로드 및 해제 후 갱신) */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getBlockedUsers();
      setUsers(list);
    } catch (e) {
      console.log('blocked load error', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 화면 진입 시 1회 로드
  useEffect(() => {
    refresh();
  }, [refresh]);

  /** 뒤로가기 */
  const onPressBack = () => navigation.goBack();

  /** "관리" 버튼 → 차단 해제 확인 → 해제 수행 */
  const askUnblock = (user: BlockedUser) => {
    const doUnblock = async () => {
      await unblockUser(user.id);
      // 저장 성공 시 리스트에서도 제거
      setUsers(prev => prev.filter(u => u.id !== user.id));
      // 필요 시 사용자 피드백
      // Alert.alert('해제됨', `${user.name} 차단을 해제했습니다.`);
    };

    if (Platform.OS === 'ios') {
      // iOS: ActionSheet
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `${user.name} 관리`,
          options: ['취소', '차단 해제'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) doUnblock();
        }
      );
    } else {
      // Android: Alert
      Alert.alert('관리', `${user.name} 차단을 해제할까요?`, [
        { text: '취소', style: 'cancel' },
        { text: '차단 해제', style: 'destructive', onPress: doUnblock },
      ]);
    }
  };

  /** 각 사용자 행 렌더링 */
  const renderRow = (u: BlockedUser) => {
    const avatar = u.avatarUri ? { uri: u.avatarUri } : null;

    return (
      <View key={u.id} style={styles.row}>
        {/* 아바타 */}
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

        {/* 이름 / 학부(옵션) */}
        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
          {!!u.dept && <Text style={styles.dept} numberOfLines={1}>{u.dept}</Text>}
        </View>

        {/* 관리 버튼 (차단 해제) */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => askUnblock(u)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${u.name} 관리`}
        >
          <Text style={styles.manageText}>관리</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 상태바 높이 보정(디자인 맞춤용) */}
      <View style={styles.statusBar} />

      {/* 커스텀 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onPressBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.9}
        >
          {/* 프로젝트 공통 아이콘 경로에 맞게 조정하세요 */}
          <Image
            source={require('../../../assets/images/back_white.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단한 사용자</Text>
      </View>

      {/* 리스트 영역 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.muted}>불러오는 중…</Text>
        ) : users.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>차단한 사용자가 없어요.</Text>
            <Text style={styles.emptySub}>
              채팅/게시글 화면에서 사용자 메뉴로 차단을 설정할 수 있어요.
            </Text>
          </View>
        ) : (
          users.map(renderRow)
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
