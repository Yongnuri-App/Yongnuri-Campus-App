// components/Header/MainHeader.tsx
import React from 'react';
import { Image, Text, View } from 'react-native';
import HeaderIcons from './HeaderIcons';
import styles from './MainHeader.styles';

export default function MainHeader() {
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

      {/* 우측: 아이콘 그룹 (분리 컴포넌트) */}
      <HeaderIcons />
    </View>
  );
}
