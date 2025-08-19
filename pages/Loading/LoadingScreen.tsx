import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';
import { RootStackParamList } from '../../types/navigation';
import styles from './LoadingScreen.styles';

const LoadingScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 아이콘 통통 튀는 애니메이션
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(() => {
      navigation.navigate('Login'); // 로그인 페이지 등록 필요
    }, 1000);

    return () => clearTimeout(timeout);
  }, [bounceAnim, navigation]);

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/images/background.png')} style={styles.background} />
      <Animated.Image
        source={require('../../assets/images/yongnuri-icon.png')}
        style={[
          styles.icon,
          {
            transform: [
              {
                scale: bounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
              {
                translateY: bounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};

export default LoadingScreen;
