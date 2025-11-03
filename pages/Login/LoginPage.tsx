// pages/Login/LoginPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { RootStackParamList } from '../../types/navigation';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../../utils/admin';
import { clearIsAdmin, setIsAdmin } from '../../utils/auth';
import styles from './LoginPage.styles';

import {
  ensureLocalIdentity,
  setAuthEmailNormalized,
} from '../../utils/localIdentity';
import {
  clearSession,
  setSessionFromUser,
  StoredUser,
  USERS_ALL_KEY,
} from '../../utils/session';

// 🔗 API
import { authApi } from '../../api/auth';
import { setAuthToken } from '../../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export default function LoginPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /** users_all_v1 에 (email 기준) 레코드 업서트 */
  const upsertUser = async (record: StoredUser) => {
    const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
    const list: StoredUser[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(
      (u) => u.email?.toLowerCase() === record.email.toLowerCase()
    );
    if (idx >= 0) list[idx] = { ...list[idx], ...record };
    else list.unshift(record);
    await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(list));
  };

  /** ✅ 로그인 성공 공통 처리: 토큰 저장 + axios 헤더 + 세션/프로필 업서트 */
  const handleLoginSuccess = async (
    emLower: string,
    tokens: { accessToken: string; refreshToken?: string }
  ) => {
    const { accessToken, refreshToken } = tokens;

    // ✅ 1) 토큰 저장 (모든 호환 키 포함)
    await AsyncStorage.multiSet([
      ['auth_token', accessToken],      // ← 인터셉터 & WithdrawPage 참조 키
      [ACCESS_TOKEN_KEY, accessToken],
      ['accessToken', accessToken],
    ]);
    if (refreshToken) {
      await AsyncStorage.multiSet([
        [REFRESH_TOKEN_KEY, refreshToken],
        ['refreshToken', refreshToken],
      ]);
    }

    // ✅ 2) axios Authorization 전역 세팅
    setAuthToken(accessToken);

    // ✅ 3) 내 정보 조회 (없으면 스킵)
    let me: any = null;
    try {
      const meRes = await authApi.me();
      me = meRes?.data ?? null;
    } catch (err) {
      console.log('[LOGIN] /users/me failed (continue without profile)', err);
    }

    // ✅ 4) 로컬 DB 업서트 & 세션 저장
    const profile = {
      email: emLower,
      name: me?.name ?? '',
      nickname: me?.nickname ?? '',
      department: me?.major ?? me?.department ?? '',
      studentId: me?.studentId ? String(me?.studentId) : '',
      isAdmin:
        !!me?.isAdmin || emLower === ADMIN_EMAIL.toLowerCase(), // 서버 값 우선
    };

    await upsertUser({
      email: profile.email,
      name: profile.name,
      nickname: profile.nickname,
      department: profile.department,
      studentId: profile.studentId,
      password: '', // 클라 비밀번호 저장 X
      isAdmin: profile.isAdmin,
      createdAt: new Date().toISOString(),
    });

    await setSessionFromUser(profile);
    await setAuthEmailNormalized(emLower);
    await ensureLocalIdentity();

    // ✅ 5) 관리자 플래그(앱 로컬 정책용)
    if (profile.isAdmin) await setIsAdmin(true);
    else await clearIsAdmin();

    // ✅ 6) 홈 이동
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { initialTab: 'market' } }],
    });
  };

  const onPressLogin = async () => {
    const em = email.trim();
    if (!em || !password) {
      Alert.alert('안내', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (loading) return;

    try {
      setLoading(true);

      // 기존 세션/관리자 초기화
      await clearIsAdmin();
      await clearSession();

      // ✅ (A) 관리자 하드코딩 로그인
      if (
        em.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
        password === ADMIN_PASSWORD
      ) {
        console.log('[LOGIN] ▶ /auth/login (admin)');
        const res = await authApi.login({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });
        console.log(
          '[LOGIN] ◀ /auth/login (admin)',
          res?.status,
          !!res?.data?.accessToken
        );
        const accessToken: string | undefined = res?.data?.accessToken;
        const refreshToken: string | undefined = res?.data?.refreshToken;
        if (!accessToken)
          throw new Error('서버에서 accessToken을 받지 못했습니다.');

        await handleLoginSuccess(ADMIN_EMAIL.toLowerCase(), {
          accessToken,
          refreshToken,
        });
        return;
      }

      // ✅ (B) 일반 사용자 로그인
      console.log('[LOGIN] ▶ /auth/login request', { email: em });
      const res = await authApi.login({ email: em, password });
      console.log('[LOGIN] ◀ /auth/login response', res?.status, res?.data);

      const accessToken: string | undefined = res?.data?.accessToken;
      const refreshToken: string | undefined = res?.data?.refreshToken;
      if (!accessToken)
        throw new Error('서버에서 accessToken을 받지 못했습니다.');

      await handleLoginSuccess(em.toLowerCase(), {
        accessToken,
        refreshToken,
      });
    } catch (e: any) {
      console.log('[LOGIN] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const msg =
        e?.response?.data?.message ??
        (e?.response?.status
          ? `로그인 실패 (HTTP ${e.response.status})`
          : '네트워크 오류가 발생했습니다.');
      Alert.alert('로그인 실패', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
        <Image
          source={require('../../assets/images/yongnuri-icon.png')}
          style={styles.logo}
          resizeMode="contain"
          accessible
          accessibilityLabel="Yongnuri Campus 로고"
        />

        <Text style={styles.title}>Yongnuri Campus</Text>
        <Text style={styles.subtitle}>
          용누리 캠퍼스와 함께하는 용인대학교 생활 :)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={onPressLogin}
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={onPressLogin}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>로그인</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomLinks}>
          <TouchableOpacity
            disabled={loading}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.linkText}>회원가입</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            disabled={loading}
            onPress={() => navigation.navigate('PasswordReset')}
          >
            <Text style={styles.linkText}>비밀번호 재설정</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
