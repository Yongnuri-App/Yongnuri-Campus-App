// pages/Login/LoginPage.tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
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
import { setIsAdmin } from '../../utils/auth';
import { RootStackParamList } from '../../types/navigation';
import styles from './LoginPage.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ✅ 임시 관리자 계정 (API 연결 전)
  const ADMIN_ID = '202178028@yiu.ac.kr';
  const ADMIN_PW = '1234';

  const onPressLogin = async () => {
    const isAdmin = email.trim() === ADMIN_ID && password === ADMIN_PW;

    // ✅ 관리자 여부를 영속화
    await setIsAdmin(isAdmin);

    // 둘 다 Main으로 가되, 관리자면 flag만 true
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { isAdmin, initialTab: 'market' } }],
    });
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
