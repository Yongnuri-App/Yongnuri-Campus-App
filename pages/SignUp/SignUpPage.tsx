// pages/SignUp/SignUpPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import styles from './SignUpPage.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const MAX_NICKNAME = 6;
const clampNickname = (text: string) => Array.from(text).slice(0, MAX_NICKNAME).join('');

export default function SignUpPage({ navigation }: Props) {
  // ✅ 상태들
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ 포커스 참조
  const codeRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const deptRef = useRef<TextInput>(null);
  const nickRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const passCheckRef = useRef<TextInput>(null);

  // ✅ 유효성 검사 함수들
  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const isValidCode = (value: string) => /^\d{6}$/.test(value);
  const isPasswordValid = (value: string) =>
    /^[A-Za-z0-9!@#$%^&*()_+{}\[\]:;<>,.?/~\\-]{8,}$/.test(value);

  useEffect(() => {
    const filled =
      isValidEmail(email) &&
      isValidCode(code) &&
      name.trim() !== '' &&
      department.trim() !== '' &&
      nickname.trim() !== '' &&
      nickname.length <= MAX_NICKNAME &&
      isPasswordValid(password) &&
      password === passwordCheck;

    setIsFormValid(filled);
  }, [email, code, name, department, nickname, password, passwordCheck]);

  const handleSignUp = () => {
    if (!isFormValid || loading) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Login');
    }, 1500); // 가상 로딩
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>회원가입</Text>
        </View>

        <Text style={styles.sectionTitle}>본인인증하기</Text>

        <Text style={styles.label}>이메일</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="abc@yiu.ac.kr"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonText}>인증요청</Text>
          </TouchableOpacity>
        </View>

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
            onSubmitEditing={() => nameRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonText}>인증확인</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>필수정보입력</Text>

        <Text style={styles.label}>이름</Text>
        <TextInput
          ref={nameRef}
          style={styles.input}
          placeholder="홍길동"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          onSubmitEditing={() => deptRef.current?.focus()}
        />

        <Text style={styles.label}>학과</Text>
        <TextInput
          ref={deptRef}
          style={styles.input}
          placeholder="전공 학과"
          value={department}
          onChangeText={setDepartment}
          returnKeyType="next"
          onSubmitEditing={() => nickRef.current?.focus()}
        />

        <Text style={styles.label}>닉네임 (최대 6자)</Text>
        <TextInput
          ref={nickRef}
          style={styles.input}
          placeholder="닉네임"
          value={nickname}
          onChangeText={(t) => setNickname(clampNickname(t))}
          maxLength={MAX_NICKNAME}
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          ref={passRef}
          style={styles.input}
          placeholder="비밀번호 (영문/숫자/특수문자)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
          onSubmitEditing={() => passCheckRef.current?.focus()}
        />

        <Text style={styles.label}>비밀번호 확인</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={passCheckRef}
            style={styles.input}
            placeholder="비밀번호 확인"
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

        <TouchableOpacity
          style={[
            styles.signUpButton,
            { backgroundColor: isFormValid && !loading ? '#0035A4' : '#ccc' },
          ]}
          disabled={!isFormValid || loading}
          onPress={handleSignUp}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpButtonText}>회원가입</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
