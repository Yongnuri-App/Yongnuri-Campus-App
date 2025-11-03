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
import axios from 'axios';
import styles from './WithdrawPage.styles';

// 우리 공용 axios 인스턴스(인터셉터 포함)
import { api } from '@/api/client';

// 세션/프로필 관련 키 (기존 그대로)
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';
const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_IS_ADMIN_KEY = 'auth_is_admin';
const USERS_ALL_KEY = 'users_all_v1';

export default function WithdrawPage() {
  const navigation = useNavigation<any>();

  const onPressBack = () => navigation.goBack();

  /** 현재 로그인 사용자(email) 기준으로 로컬 유저 DB에서 계정 삭제 */
  const deleteCurrentUserFromDB = async () => {
    try {
      const email = (await AsyncStorage.getItem(AUTH_EMAIL_KEY)) ?? '';
      if (!email) return;

      const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
      if (!raw) return;

      const users: any[] = JSON.parse(raw);
      const filtered = users.filter(
        (u) => (u?.email ?? '').toLowerCase() !== email.toLowerCase()
      );

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
      await deleteCurrentUserFromDB();

      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY,
        AUTH_NAME_KEY,
        AUTH_STUDENT_ID_KEY,
        AUTH_NICKNAME_KEY,
        AUTH_EMAIL_KEY,
        AUTH_IS_ADMIN_KEY,
        'accessToken',
        'refreshToken',
        'access_token',
        'refresh_token',
      ]);
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  /** 서버 탈퇴 호출 → 성공 시 hardLogout */
  const callDeleteAccount = async () => {
    // api 인터셉터는 /auth/**에서 Authorization을 제거하므로, axios로 직접 호출한다.
    const baseURL = api.defaults.baseURL || 'http://localhost:8080';

    // 토큰은 AsyncStorage에서 직접 읽어서 Bearer로 보낸다.
    const rawToken =
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('access_token')) ||
      '';

    if (!rawToken) {
      Alert.alert('오류', '로그인 정보가 없습니다. 다시 로그인 해주세요.');
      await hardLogout();
      return;
    }

    const bearer = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;

    try {
      const res = await axios.post(
        `${baseURL}/auth/deleteAccount`,
        {}, // body 없음
        {
          headers: {
            Authorization: bearer,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('[withdraw] deleteAccount response', res?.status, res?.data);
      Alert.alert('정상적으로 탈퇴가 완료되었습니다!', '그동안 감사했습니다. 안녕히 가세요!', [
        { text: '확인', onPress: hardLogout },
      ]);
    } catch (err: any) {
      console.log('[withdraw] deleteAccount error', err?.response || err?.message);
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        '탈퇴 처리 중 오류가 발생했습니다.';

      if (status === 401) {
        Alert.alert('세션 만료', '토큰이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.', [
          { text: '확인', onPress: hardLogout },
        ]);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  /** 원래 UI 흐름 유지: 안내 모달 → 확인 시 실제 탈퇴 호출 */
  const confirmWithdraw = () => {
    Alert.alert(
      '정말 탈퇴하시겠어요?',
      '탈퇴 시 회원님의 기존 정보는 영구 삭제되며 되돌릴 수 없습니다.\n소중한 정보가 있을 수 있으니 신중히 선택하세요!',
      [
        { text: '취소', style: 'cancel' },
        { text: '계정 삭제', style: 'destructive', onPress: callDeleteAccount },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      {/* 헤더 (원래 디자인 그대로) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onPressBack}>
          <Image
            source={require('../../../assets/images/back_white.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>탈퇴하기</Text>
      </View>

      {/* 본문 (원래 스타일 키 유지: body / title / desc) */}
      <View style={styles.body}>
        <Text style={styles.title}>정말 탈퇴하시겠어요?</Text>
        <Text style={styles.desc}>
          {'\n'}탈퇴 시 회원님의 기존 정보는 영구 삭제 되며 {'\n'}되돌릴 수 없습니다.
          {'\n'}소중한 정보가 있을 수 있으니 신중히 선택하세요!
        </Text>

        {/* 버튼 영역 (원래 스타일 키 유지: btnRow / cancelBtn / withdrawBtn) */}
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
