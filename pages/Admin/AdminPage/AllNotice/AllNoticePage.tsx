import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import styles from './AllNoticePage.styles';
import AlarmItem from '../../../../components/ListTile/alarmItem/alarmItem';
import FloatingWriteButton from '../../../../components/FloatingButton/FloatingWriteButton';

type AlarmRow = {
  id: string;
  title: string;
  description: string;
  createdAt: string; // ISO
};

const STORAGE_KEY = 'alarm_list_v1';
const LEGACY_NOTICE_KEY = 'all_notice_posts_v1';

async function loadAlarms(): Promise<AlarmRow[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const list: AlarmRow[] = raw ? JSON.parse(raw) : [];

  const legacyRaw = await AsyncStorage.getItem(LEGACY_NOTICE_KEY);
  if (legacyRaw) {
    try {
      const legacy: any[] = JSON.parse(legacyRaw) || [];
      const mapped: AlarmRow[] = legacy.map((n) => ({
        id: n.id ?? `${Date.now()}`,
        title: n.title?.startsWith('[관리자]') ? n.title : `[관리자] ${n.title ?? ''}`,
        description: (n.description ?? '').toString().replace(/\s*\n+\s*/g, ' ').trim(),
        createdAt: n.createdAt ?? n.startDate ?? new Date().toISOString(),
      }));
      const merged = [...mapped, ...list];
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      await AsyncStorage.removeItem(LEGACY_NOTICE_KEY);
      return merged;
    } catch {/* ignore */}
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export default function AllNoticePage() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<AlarmRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await loadAlarms();
    setData(next);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const goBack = () => navigation.goBack(); // ← 리셋 제거

  const renderItem = ({ item }: { item: AlarmRow }) => (
    <AlarmItem
      title={item.title}
      description={item.description}
      createdAt={item.createdAt}
      onPress={undefined}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Image
            source={require('../../../../assets/images/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전체 공지사항</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 알림 리스트 */}
      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<View style={styles.listEdge} />}
        ListFooterComponent={<View style={styles.listEdge} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>등록된 알림이 없어요.</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* 글쓰기 → Create 페이지로 이동 */}
      <FloatingWriteButton
        activeTab="notice"
        bottomOffset={60}
        onPressOverride={() => navigation.navigate('AdminAllNoticeCreate')}
      />
    </SafeAreaView>
  );
}
