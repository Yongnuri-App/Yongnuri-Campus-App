// pages/My/Withdraw/WithdrawPage.tsx
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
const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_IS_ADMIN_KEY = 'auth_is_admin'; // 혹시 남아있을 수 있는 관리자 플래그

const USERS_ALL_KEY = 'users_all_v1';

export default function WithdrawPage() {
  const navigation = useNavigation<any>();

  const onPressBack = () => navigation.goBack();

  /** 현재 로그인 사용자(email) 기준으로 로컬 유저 DB에서 계정 삭제 */
  const deleteCurrentUserFromDB = async () => {
    try {
      const email = (await AsyncStorage.getItem(AUTH_EMAIL_KEY)) ?? '';
      if (!email) return; // 세션에 이메일이 없으면 스킵

      const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
      if (!raw) return;

      const users: any[] = JSON.parse(raw);
      const filtered = users.filter(
        (u) => (u?.email ?? '').toLowerCase() !== email.toLowerCase()
      );

      // 변경이 있을 때만 저장
      if (filtered.length !== users.length) {
        await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.log('deleteCurrentUserFromDB error', e);
    }
  };

  /** 세션/프로필 키 전체 정리 + 로그인 화면으로 이동 */
  const hardLogout = async () => {
    try {
      // 1) 유저DB에서 계정 제거
      await deleteCurrentUserFromDB();

      // 2) 세션/프로필 키 제거
      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY,
        AUTH_NAME_KEY,
        AUTH_STUDENT_ID_KEY,
        AUTH_NICKNAME_KEY,
        AUTH_EMAIL_KEY,
        AUTH_IS_ADMIN_KEY, // 혹시 남아있던 관리자 플래그도 제거
      ]);
    } finally {
      // 3) 로그인 화면으로 리셋
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const confirmWithdraw = () => {
    // 안내 문구는 그대로 두되, 확인 누르면 실제 삭제(hardLogout) 수행
    Alert.alert(
      '정상적으로 탈퇴가 완료되었습니다!',
      '그동안 감사했습니다. 안녕히 가세요!',
      [{ text: '확인', style: 'default', onPress: hardLogout }],
      { cancelable: false }
    );
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
