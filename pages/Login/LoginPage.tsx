// pages/Login/LoginPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
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
import { setIsAdmin, clearIsAdmin } from '../../utils/auth';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../../utils/admin';
import { RootStackParamList } from '../../types/navigation';
import styles from './LoginPage.styles';
import {
  setSessionFromUser,
  USERS_ALL_KEY,
  StoredUser,
  clearSession,
} from '../../utils/session';
import {
  setAuthEmailNormalized,   // ✅ 추가: 이메일 스코프 저장/해제
  ensureLocalIdentity,       // ✅ 추가: 기기 고유 ID 보장(선택)
} from '../../utils/localIdentity';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /** users_all_v1 에 (email 기준) 레코드 업서트 */
  const upsertUser = async (record: StoredUser) => {
    const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
    const list: StoredUser[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(
      (u) => u.email?.toLowerCase() === record.email.toLowerCase()
    );
    if (idx >= 0) {
      // 기존 값 보존 + 최신 필드만 갱신
      list[idx] = { ...list[idx], ...record };
    } else {
      list.unshift(record);
    }
    await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(list));
  };

  const onPressLogin = async () => {
    const em = email.trim();
    if (!em || !password) {
      Alert.alert('안내', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      // 혹시 남아있는 관리자/세션 정보 초기화
      await clearIsAdmin();
      await clearSession();

      // 1) 관리자 하드코딩 로그인 (가입 여부와 무관)
      if (em.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
        await setIsAdmin(true);

        // DB에도 관리자 레코드 업서트해서 ProfileRow가 DB 기준으로 읽을 수 있게
        await upsertUser({
          email: ADMIN_EMAIL.toLowerCase(),
          name: '관리자',
          nickname: '관리자',
          department: '',
          studentId: '',
          password: 'ADMIN', // 표시용/검증용은 아님
          isAdmin: true,
          createdAt: new Date().toISOString(),
        });

        // 세션 저장
        await setSessionFromUser({
          email: ADMIN_EMAIL.toLowerCase(),
          name: '관리자',
          nickname: '관리자',
          studentId: '',
          department: '',
          isAdmin: true,
        });

        // ✅ 이메일 스코프 저장(표준/구키 모두) + 기기 ID 보장
        await setAuthEmailNormalized(ADMIN_EMAIL.toLowerCase());
        await ensureLocalIdentity();

        navigation.reset({
          index: 0,
          routes: [{ name: 'Main', params: { initialTab: 'market' } }],
        });
        return;
      }

      // 2) 일반 사용자 로그인: 가입된 사용자만 허용
      const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
      const users: StoredUser[] = raw ? JSON.parse(raw) : [];
      const user = users.find(
        (u) => u.email?.toLowerCase() === em.toLowerCase() && u.password === password
      );

      if (!user) {
        Alert.alert('로그인 실패', '가입된 사용자만 로그인할 수 있습니다.');
        return;
      }

      await setIsAdmin(false);

      // (안전) 이메일 소문자 표준화한 값으로 users_all_v1 도 갱신해 둠
      await upsertUser({
        ...user,
        email: user.email.toLowerCase(),
      });

      // 세션 저장
      await setSessionFromUser({
        email: user.email.toLowerCase(),
        name: user.name,
        nickname: user.nickname,
        studentId: user.studentId ?? '',
        department: user.department ?? '',
        isAdmin: false,
      });

      // ✅ 이메일 스코프 저장(표준/구키 모두) + 기기 ID 보장
      await setAuthEmailNormalized(user.email.toLowerCase());
      await ensureLocalIdentity();

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { initialTab: 'market' } }],
      });
    } catch (e) {
      console.error('login error', e);
      Alert.alert('오류', '로그인 처리 중 문제가 발생했습니다.');
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
        <Text style={styles.subtitle}>용누리 캠퍼스와 함께하는 용인대학교 생활 :)</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={onPressLogin}
        />

        <TouchableOpacity style={styles.loginButton} onPress={onPressLogin} activeOpacity={0.8}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>

        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.linkText}>회원가입</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => navigation.navigate('PasswordReset')}>
            <Text style={styles.linkText}>비밀번호 재설정</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
