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
  AlarmRow,
} from '../../utils/alarmStorage';

export default function HeaderIcons() {
  const navigation = useNavigation<any>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const refreshBadge = useCallback(async () => {
    try {
      const identity = await getIdentityScope();
      if (!identity) return setNotificationCount(0);

      const [broadcast, personal] = await Promise.all([
        loadBroadcast(),
        loadUserAlarms(identity),
      ]);

      const seenKey = seenKeyByIdentity(identity);
      const saved = (await AsyncStorage.getItem(seenKey)) || null;
      const t = saved ? new Date(saved).getTime() : 0;

      const all: AlarmRow[] = [...broadcast, ...personal];
      let count = 0;
      if (t > 0) {
        count = all.reduce(
          (acc, it) => (new Date(it.createdAt).getTime() > t ? acc + 1 : acc),
          0
        );
      } else {
        count = all.length;
      }
      setNotificationCount(count);
    } catch {
      setNotificationCount(0);
    }
  }, []);

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
    // 낙관적 바로 0 → 돌아오면 focus에서 재계산
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
