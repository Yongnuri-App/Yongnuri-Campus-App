import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordReset'>;

export default function PasswordResetPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);

  // 포커스 이동용 ref
  const codeRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordCheckRef = useRef<TextInput>(null);

  // 유효성 검사 함수들
  const isValidEmail = (text: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

  const isValidCode = (text: string) =>
    /^\d{6}$/.test(text); // 숫자 6자리

  const isValidPassword = (pw: string) =>
    /[A-Za-z]/.test(pw) &&
    /\d/.test(pw) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(pw) &&
    pw.length >= 8;

  useEffect(() => {
    const valid =
      isValidEmail(email) &&
      isValidCode(code) &&
      isValidPassword(password) &&
      password === passwordCheck;

    setIsValid(valid);
  }, [email, code, password, passwordCheck]);

  const handleReset = () => {
    if (!isValid) return;
    setLoading(true);

    // 가짜 처리
    setTimeout(() => {
      setLoading(false);
      Alert.alert('비밀번호가 재설정되었습니다.');
      navigation.goBack();
    }, 1500);
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
            style={[styles.input, { flex: 1 }]}
            placeholder="abc@email.com"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
          />
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonText}>인증요청</Text>
          </TouchableOpacity>
        </View>

        {/* 인증번호 */}
        <Text style={styles.label}>인증번호</Text>
        <View style={styles.row}>
          <TextInput
            ref={codeRef}
            style={[styles.input, { flex: 1 }]}
            placeholder="인증번호 6자리"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonText}>인증확인</Text>
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
            { backgroundColor: isValid ? '#007bff' : '#ccc' },
          ]}
          onPress={handleReset}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signUpButtonText}>완료</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
