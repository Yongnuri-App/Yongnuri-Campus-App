// pages/PasswordReset/PasswordResetPage.tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { RootStackParamList } from '../../types/navigation';
import styles from './PasswordResetPage.styles';
import { authApi } from '../../api/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordReset'>;

export default function PasswordResetPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');

  // 상태
  const [isVerified, setIsVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  // 포커스 이동용 ref
  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordCheckRef = useRef<TextInput>(null);

  // 유효성
  const isValidEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  const isValidCode = (text: string) => /^\d{5}$/.test(text); // ✅ 숫자 5자리
  const isValidPassword = (pw: string) =>
    /[A-Za-z]/.test(pw) && /\d/.test(pw) && /[!@#$%^&*(),.?":{}|<>]/.test(pw) && pw.length >= 8;

  const isFormValid =
    isValidEmail(email) &&
    isValidCode(code) &&
    isValidPassword(password) &&
    password === passwordCheck &&
    isVerified;

  // (1) 인증요청
  const handleRequestCode = async () => {
    const em = email.trim();
    if (!isValidEmail(em)) {
      Alert.alert('안내', '올바른 이메일을 입력해주세요.');
      return;
    }
    if (loadingEmail) return;

    try {
      setLoadingEmail(true);
      console.log('[RESET][EMAIL] ▶ request', { email: em });
      const res = await authApi.requestEmailCode({ email: em });
      console.log('[RESET][EMAIL] ◀ response', { status: res?.status, data: res?.data });
      setCodeSent(true);
      Alert.alert('인증요청 완료', '해당 이메일로 **5자리** 인증코드를 보냈습니다.\n메일함을 확인해주세요.');
      setTimeout(() => codeRef.current?.focus(), 120);
    } catch (e: any) {
      console.log('[RESET][EMAIL] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const msg =
        e?.response?.data?.message ??
        (e?.response?.status ? `요청 실패 (HTTP ${e.response.status})` : '네트워크 오류가 발생했습니다.');
      Alert.alert('실패', msg);
    } finally {
      setLoadingEmail(false);
    }
  };

  // (2) 인증확인
  const handleVerifyCode = async () => {
    if (!codeSent) {
      Alert.alert('안내', '먼저 인증요청을 눌러주세요.');
      return;
    }
    if (!isValidCode(code)) {
      Alert.alert('안내', '인증번호 **5자리**를 입력해주세요.');
      return;
    }
    if (loadingVerify) return;

    try {
      setLoadingVerify(true);
      const payload = { email: email.trim(), number: code.trim() };
      console.log('[RESET][VERIFY] ▶ request', payload);
      const res = await authApi.verifyEmailCode(payload);
      console.log('[RESET][VERIFY] ◀ response', { status: res?.status, data: res?.data });
      setIsVerified(true);
      Alert.alert('인증 완료', '이메일 인증이 완료되었습니다.');
      setTimeout(() => passwordRef.current?.focus(), 120);
    } catch (e: any) {
      console.log('[RESET][VERIFY] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      Alert.alert('인증 실패', e?.response?.data?.message ?? '인증번호가 올바르지 않습니다.');
    } finally {
      setLoadingVerify(false);
    }
  };

  // (3) 비밀번호 재설정
  const handleReset = async () => {
    if (!isFormValid || loadingReset) return;

    try {
      setLoadingReset(true);
      const body = {
        email: email.trim().toLowerCase(),
        password,
        passwordCheck,
      };
      console.log('[RESET][SUBMIT] ▶ /auth/resetPassword', { ...body, password: '***', passwordCheck: '***' });

      const res = await authApi.resetPassword(body);
      console.log('[RESET][SUBMIT] ◀ response', { status: res?.status, data: res?.data });

      Alert.alert('완료', '비밀번호가 재설정되었습니다.');
      navigation.goBack();
    } catch (e: any) {
      console.log('[RESET][SUBMIT] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const msg =
        e?.response?.data?.message ??
        (e?.response?.status ? `재설정 실패 (HTTP ${e.response.status})` : '네트워크 오류가 발생했습니다.');
      Alert.alert('실패', msg);
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* 뒤로가기 + 제목 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>비밀번호 재설정</Text>
        </View>

        {/* 본인인증하기 */}
        <Text style={styles.sectionTitle}>본인인증하기</Text>

        {/* 이메일 */}
        <Text style={styles.label}>이메일 주소</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, opacity: isVerified ? 0.6 : 1 }]}
            placeholder="abc@email.com"
            value={email}
            onChangeText={setEmail}
            editable={!isVerified}
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.subButton, { opacity: isVerified ? 0.5 : 1 }]}
            onPress={handleRequestCode}
            disabled={isVerified || loadingEmail}
          >
            {loadingEmail ? <ActivityIndicator /> : <Text style={styles.subButtonText}>{codeSent ? '재요청' : '인증요청'}</Text>}
          </TouchableOpacity>
        </View>

        {/* 인증번호 */}
        <Text style={styles.label}>인증번호</Text>
        <View style={styles.row}>
          <TextInput
            ref={codeRef}
            style={[styles.input, { flex: 1, opacity: isVerified ? 0.6 : 1 }]}
            placeholder="인증번호 5자리"
            value={code}
            onChangeText={setCode}
            editable={!isVerified}
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TouchableOpacity
            style={[styles.subButton, { opacity: isVerified ? 0.5 : 1 }]}
            onPress={handleVerifyCode}
            disabled={isVerified || loadingVerify}
          >
            {loadingVerify ? <ActivityIndicator /> : <Text style={styles.subButtonText}>인증확인</Text>}
          </TouchableOpacity>
        </View>

        {/* 비밀번호 재설정 */}
        <Text style={styles.sectionTitle}>비밀번호 재설정</Text>

        {/* 새 비밀번호 */}
        <Text style={styles.label}>새 비밀번호</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="영문, 숫자, 특수문자 포함 8자 이상"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
          onSubmitEditing={() => passwordCheckRef.current?.focus()}
        />

        {/* 새 비밀번호 확인 */}
        <Text style={styles.label}>새 비밀번호 확인</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={passwordCheckRef}
            style={styles.input}
            placeholder="비밀번호 재입력"
            secureTextEntry
            value={passwordCheck}
            onChangeText={setPasswordCheck}
          />
          {passwordCheck.length > 0 && passwordCheck === password && (
            <Image
              source={require('../../assets/images/correct.png')}
              style={styles.correctIcon}
              resizeMode="contain"
            />
          )}
        </View>

        {/* 완료 버튼 */}
        <TouchableOpacity
          style={[
            styles.signUpButton,
            { backgroundColor: isFormValid && !loadingReset ? '#007bff' : '#ccc' },
          ]}
          onPress={handleReset}
          disabled={!isFormValid || loadingReset}
        >
          {loadingReset ? <ActivityIndicator color="white" /> : <Text style={styles.signUpButtonText}>완료</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
