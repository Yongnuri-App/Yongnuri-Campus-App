import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styles from './WithdrawPage.styles';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';

export default function WithdrawPage() {
  const navigation = useNavigation<any>();

  const onPressBack = () => navigation.goBack();

  const confirmWithdraw = () => {
    Alert.alert(
      '정상적으로 탈퇴가 완료되었습니다!',
      '그동안 감사했습니다. 안녕히 가세요!',
      [{ text: '확인', style: 'default', onPress: hardLogout }],
      { cancelable: false }
    );
  };

  const hardLogout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_NAME_KEY),
        AsyncStorage.removeItem(AUTH_STUDENT_ID_KEY),
        AsyncStorage.removeItem(AUTH_NICKNAME_KEY),
      ]);
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onPressBack}>
          <Image
            source={require('../../../assets/images/back_white.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>탈퇴하기</Text>
      </View>

      {/* 본문 */}
      <View style={styles.body}>
        <Text style={styles.title}>정말 탈퇴하시겠어요?</Text>
        <Text style={styles.desc}>
          {'\n'}탈퇴 시 회원님의 기존 정보는 영구 삭제 되며 {'\n'}되돌릴 수 없습니다.
          {'\n'}소중한 정보가 있을 수 있으니 신중히 선택하세요!
        </Text>

        {/* 버튼 영역 (본문 밑에 위치) */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onPressBack}
            activeOpacity={0.9}
          >
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={confirmWithdraw}
            activeOpacity={0.9}
          >
            <Text style={styles.withdrawText}>계정 삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
