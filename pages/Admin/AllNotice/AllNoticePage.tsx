// pages/Admin/AllNotice/AllNoticePage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FloatingWriteButton from '../../../components/FloatingButton/FloatingWriteButton';
import AlarmItem from '../../../components/ListTile/alarmItem/alarmItem';
import styles from './AllNoticePage.styles';
import { fetchAllNotices, type ServerAllNotice } from '@/api/allNotice';

type AlarmRow = {
  id: string;
  title: string;
  description: string;
  createdAt: string; // ISO
};

const STORAGE_KEY = 'alarm_list_v1';
const LEGACY_NOTICE_KEY = 'all_notice_posts_v1';

const uniqId = (prefix = 'notice') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function normalize(rows: ServerAllNotice[]): AlarmRow[] {
  return (rows || []).map((r: any, idx: number) => {
    const id =
      r?.id != null
        ? String(r.id)
        : `${r?.title ?? 'notice'}_${r?.createdAt ?? r?.created_at ?? r?.regDate ?? idx}`;
    const created = r?.createdAt || r?.created_at || r?.regDate || new Date().toISOString();
    const title = String(r?.title ?? '').trim();
    const content = String(r?.content ?? '').trim();
    return {
      id,
      title: title.startsWith('[관리자]') ? title : `[관리자] ${title}`,
      description: content.replace(/\s*\n+\s*/g, ' '),
      createdAt: new Date(created).toISOString(),
    };
  });
}

async function loadLocal(): Promise<AlarmRow[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const list: AlarmRow[] = raw ? JSON.parse(raw) : [];

  const legacyRaw = await AsyncStorage.getItem(LEGACY_NOTICE_KEY);
  if (legacyRaw) {
    try {
      const legacy: any[] = JSON.parse(legacyRaw) || [];
      const mapped: AlarmRow[] = legacy.map((n, i) => ({
        id:
          (n.id && String(n.id)) ||
          `legacy_${i}_${n.createdAt || n.startDate || Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 6)}`,
        title: n.title?.startsWith('[관리자]') ? n.title : `[관리자] ${n.title ?? ''}`,
        description: (n.description ?? '').toString().replace(/\s*\n+\s*/g, ' ').trim(),
        createdAt: n.createdAt ?? n.startDate ?? new Date().toISOString(),
      }));

      const merged = [...mapped, ...list];
      const seen = new Set<string>();
      const dedup: AlarmRow[] = [];
      for (const item of merged) {
        let id = String(item.id || '');
        if (!id || seen.has(id)) id = uniqId('alarm');
        seen.add(id);
        dedup.push({ ...item, id });
      }

      dedup.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dedup));
      await AsyncStorage.removeItem(LEGACY_NOTICE_KEY);
      return dedup;
    } catch { /* ignore */ }
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
    try {
      const server = await fetchAllNotices();
      const normalized = normalize(server);
      normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setData(normalized);
    } catch {
      const local = await loadLocal();
      setData(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const goBack = () => navigation.goBack();

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
            source={require('../../../assets/images/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전체 공지사항</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 리스트 */}
      <FlatList
        data={data}
        keyExtractor={(it, idx) => `notice:${String(it.id ?? idx)}:${it.createdAt ?? ''}`} // ✅ 유니크 키
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 140 }]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>등록된 공지가 없어요.</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* 작성 버튼 */}
      <FloatingWriteButton
        activeTab="notice"
        bottomOffset={60}
        onPressOverride={() => navigation.navigate('AdminAllNoticeCreate')}
      />
    </SafeAreaView>
  );
}
