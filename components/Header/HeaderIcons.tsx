// components/Header/HeaderIcons.tsx
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './HeaderIcons.styles';
import { getIsAdmin } from '../../utils/auth';

export default function HeaderIcons() {
  const navigation = useNavigation<any>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationCount] = useState(3); // 임시 뱃지

  // 화면에 포커스될 때마다 저장된 관리자 플래그를 읽어 최신화
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
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const goMyPage = () => {
    if (isAdmin) {
      navigation.navigate('AdminGate'); // 관리자 홈
    } else {
      navigation.navigate('MyPage'); // 일반 마이페이지
    }
  };

  return (
    <View style={styles.iconGroup}>
      {/* 검색 */}
      <TouchableOpacity onPress={() => navigation.navigate('Search')}>
        <Image source={require('../../assets/images/search.png')} style={styles.icon} />
      </TouchableOpacity>

      {/* 알림 + 뱃지 */}
      <TouchableOpacity onPress={() => navigation.navigate('Notification')}>
        <Image source={require('../../assets/images/bell.png')} style={styles.icon} />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 마이페이지 (관리자/유저 분기) */}
      <TouchableOpacity onPress={goMyPage}>
        <Image source={require('../../assets/images/person.png')} style={styles.icon} />
      </TouchableOpacity>
    </View>
  );
}
