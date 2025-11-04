// components/Header/HeaderIcons.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './HeaderIcons.styles';
import { getIsAdmin } from '../../utils/auth';
import { getIdentityScope } from '../../utils/localIdentity';
import {
  loadBroadcast,
  loadUserAlarms,
  seenKeyByIdentity,
  type AlarmRow,
} from '../../utils/alarmStorage';
import { fetchUnreadCount } from '@/api/notifications';

export default function HeaderIcons() {
  const navigation = useNavigation<any>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  /** 로컬 폴백 계산: 마지막 열람시각 이후 항목 수 */
  const computeLocalUnread = useCallback(async (): Promise<number> => {
    try {
      const identity = await getIdentityScope();
      if (!identity) return 0;

      const [broadcast, personal] = await Promise.all([
        loadBroadcast(),
        loadUserAlarms(identity),
      ]);

      const seenKey = seenKeyByIdentity(identity);
      const saved = (await AsyncStorage.getItem(seenKey)) || null;
      const t = saved ? new Date(saved).getTime() : 0;

      const all: AlarmRow[] = [...broadcast, ...personal];
      if (t > 0) {
        return all.reduce(
          (acc, it) => (new Date(it.createdAt).getTime() > t ? acc + 1 : acc),
          0
        );
      }
      return all.length;
    } catch {
      return 0;
    }
  }, []);

  /** 서버 카운트 → 실패 시 로컬 폴백 */
  const refreshBadge = useCallback(async () => {
    // 1) 서버 우선
    const server = await fetchUnreadCount();
    if (typeof server === 'number') {
      setNotificationCount(server);
      return;
    }
    // 2) 폴백
    const local = await computeLocalUnread();
    setNotificationCount(local);
  }, [computeLocalUnread]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const flag = await getIsAdmin();
          if (mounted) setIsAdmin(Boolean(flag));
        } catch {
          if (mounted) setIsAdmin(false);
        }
        if (mounted) await refreshBadge();
      })();
      return () => { mounted = false; };
    }, [refreshBadge])
  );

  const goMyPage = () => {
    if (isAdmin) navigation.navigate('AdminGate');
    else navigation.navigate('MyPage');
  };

  const goNotification = () => {
    // UX상 바로 0으로 비워두고, 알림 페이지에서 읽음 처리 후
    // 포커스가 돌아오면 useFocusEffect로 실제 서버 카운트 동기화됨.
    setNotificationCount(0);
    navigation.navigate('Notification');
  };

  return (
    <View style={styles.iconGroup}>
      <TouchableOpacity onPress={() => navigation.navigate('Search')}>
        <Image source={require('../../assets/images/search.png')} style={styles.icon} />
      </TouchableOpacity>

      <TouchableOpacity onPress={goNotification}>
        <Image source={require('../../assets/images/bell.png')} style={styles.icon} />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={goMyPage}>
        <Image source={require('../../assets/images/person.png')} style={styles.icon} />
      </TouchableOpacity>
    </View>
  );
}
