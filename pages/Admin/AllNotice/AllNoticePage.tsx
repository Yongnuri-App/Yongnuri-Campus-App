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

type AlarmRow = {
  id: string;
  title: string;
  description: string;
  createdAt: string; // ISO
};

const STORAGE_KEY = 'alarm_list_v1';
const LEGACY_NOTICE_KEY = 'all_notice_posts_v1';

// ✅ 유니크 ID 헬퍼 (마이그레이션/안전장치)
const uniqId = (prefix = 'legacy') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function loadAlarms(): Promise<AlarmRow[]> {
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
            .slice(2, 6)}`, // ✅ 아이템마다 확실히 다르게
        title: n.title?.startsWith('[관리자]') ? n.title : `[관리자] ${n.title ?? ''}`,
        description: (n.description ?? '').toString().replace(/\s*\n+\s*/g, ' ').trim(),
        createdAt: n.createdAt ?? n.startDate ?? new Date().toISOString(),
      }));

      // 혹시 기존 list와 키 충돌 방지: set로 한번 더 유니크 처리
      const merged = [...mapped, ...list];
      const seen = new Set<string>();
      const dedup: AlarmRow[] = [];
      for (const item of merged) {
        let id = String(item.id || '');
        if (!id || seen.has(id)) id = uniqId('alarm'); // ✅ 충돌 시 재발급
        seen.add(id);
        dedup.push({ ...item, id });
      }

      dedup.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dedup));
      await AsyncStorage.removeItem(LEGACY_NOTICE_KEY);
      return dedup;
    } catch {
      // 실패 시 기존 리스트 정렬만
    }
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

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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

      {/* 알림 리스트 (구분선은 AlarmItem 내부에서 처리) */}
      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        // ✅ 플로팅 버튼(높이 + 여유)만큼 바닥 패딩을 충분히
        contentContainerStyle={[styles.listContent, { paddingBottom: 140 }]}
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
