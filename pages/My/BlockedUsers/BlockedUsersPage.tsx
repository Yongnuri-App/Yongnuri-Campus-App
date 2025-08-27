import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useNavigation } from '@react-navigation/native';
import styles from './BlockedUsersPage.styles';

const BLOCKED_USERS_KEY = 'blocked_users_v1';

type BlockedUser = {
  id: string;           // 꼭 저장: 차단 판별용 (authorId / opponentId)
  name: string;         // 표시용
  dept?: string;        // 표시용 (없으면 생략)
  avatarUri?: string;   // 있으면 표시, 없으면 placeholder
};

/** ===== 차단 저장소 유틸 ===== */
async function loadBlocked(): Promise<BlockedUser[]> {
  const raw = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}
async function saveBlocked(list: BlockedUser[]) {
  await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(list));
}
export async function isUserBlocked(userId: string) {
  const list = await loadBlocked();
  return list.some(u => String(u.id) === String(userId));
}
export async function blockUser(user: BlockedUser) {
  const list = await loadBlocked();
  if (!list.some(u => String(u.id) === String(user.id))) {
    list.push(user);
    await saveBlocked(list);
  }
}
export async function unblockUser(userId: string) {
  const list = await loadBlocked();
  const next = list.filter(u => String(u.id) !== String(userId));
  await saveBlocked(next);
}

/** ===== 화면 ===== */
export default function BlockedUsersPage() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const list = await loadBlocked();
      setUsers(list);
    } catch (e) {
      console.log('blocked load error', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onPressBack = () => navigation.goBack();

  const askUnblock = (user: BlockedUser) => {
    const doUnblock = async () => {
      await unblockUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      // 알림은 조용히 처리해도 되고 아래처럼 알려줘도 돼요
      // Alert.alert('해제됨', `${user.name} 차단을 해제했습니다.`);
    };

    if (Platform.OS === 'ios') {
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
      Alert.alert('관리', `${user.name} 차단을 해제할까요?`, [
        { text: '취소', style: 'cancel' },
        { text: '차단 해제', style: 'destructive', onPress: doUnblock },
      ]);
    }
  };

  const renderRow = (u: BlockedUser) => {
    const avatar = u.avatarUri ? { uri: u.avatarUri } : null;
    return (
      <View key={u.id} style={styles.row}>
        {/* 아바타 */}
        {avatar ? (
          <Image source={avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}

        {/* 이름/학부 */}
        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
          {!!u.dept && <Text style={styles.dept} numberOfLines={1}>{u.dept}</Text>}
        </View>

        {/* 관리 버튼 */}
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
      {/* 상태바 높이 (피그마 51 / 실제는 SafeArea + 헤더로 대체) */}
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
          <Image source={require('../../../assets/images/back_white.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단한 사용자</Text>
      </View>

      {/* 리스트 */}
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
