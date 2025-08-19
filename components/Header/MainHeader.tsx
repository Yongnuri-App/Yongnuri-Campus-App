import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './MainHeader.styles';

export default function MainHeader() {
  const navigation = useNavigation<any>();
  // TODO: 알림 개수 상태 (나중에 서버와 연동 가능)
  const [notificationCount, setNotificationCount] = useState(3);

  return (
    <View style={styles.header}>
      {/* 좌측: 로고 */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/yongnuri-icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>Yongnuri Campus</Text>
      </View>

      {/* 우측: 아이콘 그룹 */}
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
    </View>
  );
}
