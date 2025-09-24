import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import AlarmItem from '../../components/ListTile/alarmItem/alarmItem';
import styles from './NotificationPage.styles';
import { getIdentityScope } from '../../utils/localIdentity';
import {
  loadBroadcast,
  loadUserAlarms,
  mergeSortAlarms,
  seenKeyByIdentity,
  AlarmRow,
} from '../../utils/alarmStorage';

export default function NotificationPage() {
  const navigation = useNavigation<any>();
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const [threshold, setThreshold] = useState<string | null>(null);

  const load = useCallback(async () => {
    // 1) 사용자 식별(이메일 우선)
    const identity = await getIdentityScope();
    if (!identity) {
      setAlarms([]);
      setThreshold(null);
      return;
    }
    const seenKey = seenKeyByIdentity(identity);

    // 2) 공지 + 개인알림 로드 후 병합
    const [broadcast, personal] = await Promise.all([
      loadBroadcast(),
      loadUserAlarms(identity),
    ]);
    const merged = mergeSortAlarms(broadcast, personal);
    setAlarms(merged);

    // 3) 저장된 마지막 열람 시각 가져와 하이라이트 판단
    const saved = (await AsyncStorage.getItem(seenKey)) || null;
    setThreshold(saved);

    // 4) 최신 시각으로 마커 갱신
    const latest = merged[0]?.createdAt ?? null;
    if (latest && (!saved || new Date(latest) > new Date(saved))) {
      await AsyncStorage.setItem(seenKey, latest);
    } else if (!saved && !latest) {
      await AsyncStorage.setItem(seenKey, new Date().toISOString());
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = useCallback(
    ({ item }: { item: AlarmRow }) => {
      const t = threshold ? new Date(threshold) : null;
      const isNew = t ? new Date(item.createdAt) > t : true;
      return (
        <AlarmItem
          title={item.title}
          description={item.description}
          createdAt={item.createdAt}
          highlight={isNew}
          reportIcon={!!item.reportIcon}   
        />
      );
    },
    [threshold]
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../assets/images/back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
      </View>

      <FlatList
        data={alarms}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#757575' }}>알림이 없어요.</Text>
          </View>
        }
      />
    </View>
  );
}
