// components/Header/HeaderIcons.tsx
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './HeaderIcons.styles';

export default function HeaderIcons() {
  const navigation = useNavigation<any>();
  const [notificationCount, setNotificationCount] = useState(3);

  return (
    <View style={styles.iconGroup}>
      {/* 검색 */}
      <TouchableOpacity onPress={() => navigation.navigate('Search')}>
        <Image
          source={require('../../assets/images/search.png')}
          style={styles.icon}
        />
      </TouchableOpacity>

      {/* 알림 + 뱃지 */}
      <TouchableOpacity onPress={() => navigation.navigate('Notification')}>
        <Image
          source={require('../../assets/images/bell.png')}
          style={styles.icon}
        />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 마이페이지 */}
      <TouchableOpacity onPress={() => console.log('마이페이지 이동 예정')}>
        <Image
          source={require('../../assets/images/person.png')}
          style={styles.icon}
        />
      </TouchableOpacity>
    </View>
  );
}
