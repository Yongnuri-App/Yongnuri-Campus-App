// components/Header/HeaderIcons.tsx
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './HeaderIcons.styles';

// (선택) 타입이 있다면 가져와도 됨
// import type { RootStackParamList } from '../../types/navigation';
// import type { RouteProp } from '@react-navigation/native';

export default function HeaderIcons() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // ✅ Main에서 전달된 관리자 플래그 읽기 (없으면 false)
  const isAdmin = Boolean(route?.params?.isAdmin);

  const [notificationCount] = useState(3); // <- 임시 배지

  const goMyPage = () => {
    if (isAdmin) {
      navigation.navigate('AdminGate');
    } else {
      navigation.navigate('MyPage');
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

      {/* 마이페이지 */}
      <TouchableOpacity onPress={goMyPage}>
        <Image source={require('../../assets/images/person.png')} style={styles.icon} />
      </TouchableOpacity>
    </View>
  );
}
