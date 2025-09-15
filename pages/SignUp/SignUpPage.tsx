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
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import styles from './SignUpPage.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const MAX_NICKNAME = 6;
const clampNickname = (text: string) => Array.from(text).slice(0, MAX_NICKNAME).join('');

/** 로컬 유저DB 키 */
const USERS_ALL_KEY = 'users_all_v1';
/** 현재 로그인 세션용 키 (다른 화면과 동일 키 유지) */
const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';
const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_DEPT_KEY = 'auth_department';

type StoredUser = {
  email: string;
  name: string;
  department: string;
  nickname: string;
  /** 프로토타입이라 평문 저장(실서비스에선 해시 필요) */
  password: string;
  /** 학번 */
  studentId?: string;
  isAdmin?: boolean;
  createdAt: string; // 정렬용
};

export default function SignUpPage({ navigation }: Props) {
  // ✅ 상태들
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');      // ✅ 학번
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ 모의(임시) 이메일 인증 상태
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // ✅ 포커스 참조
  const codeRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const deptRef = useRef<TextInput>(null);
  const studentIdRef = useRef<TextInput>(null);        // ✅ 학번
  const nickRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const passCheckRef = useRef<TextInput>(null);

  // ✅ 유효성 검사 함수들
  const isPasswordValid = (value: string) =>
    /^[A-Za-z0-9!@#$%^&*()_+{}\[\]:;<>,.?/~\\-]{8,}$/.test(value);

  // ✅ 모의 인증: 이메일은 아무거나 입력해도 요청 가능, 인증번호 123456이면 인증 완료
  const handleRequestCode = () => {
    if (!email.trim()) {
      Alert.alert('안내', '이메일을 입력해주세요.');
      return;
    }
    setCodeSent(true);
    Alert.alert('인증요청 완료', '임시 인증번호 123456을 발송했습니다. (모의)');
    setTimeout(() => codeRef.current?.focus(), 150);
  };

  const handleVerifyCode = () => {
    if (!codeSent) {
      Alert.alert('안내', '먼저 인증요청을 눌러주세요.');
      return;
    }
    if (code === '123456') {
      setIsVerified(true);
      Alert.alert('인증 완료', '이메일 인증이 완료되었습니다.');
      setTimeout(() => nameRef.current?.focus(), 150);
    } else {
      Alert.alert('인증 실패', '인증번호가 올바르지 않습니다. (예: 123456)');
    }
  };

  useEffect(() => {
    const filled =
      email.trim() !== '' &&       // 모의 단계: 형식 검증 생략
      isVerified &&                // ✅ 실제로는 인증 완료 필요
      name.trim() !== '' &&
      department.trim() !== '' &&
      studentId.trim() !== '' &&   // ✅ 학번 필수
      nickname.trim() !== '' &&
      nickname.length <= MAX_NICKNAME &&
      isPasswordValid(password) &&
      password === passwordCheck;

    setIsFormValid(filled);
  }, [email, isVerified, name, department, studentId, nickname, password, passwordCheck]);

  const handleSignUp = async () => {
    if (!isFormValid || loading) return;
    setLoading(true);

    try {
      // 1) 기존 유저 목록 불러오기
      const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
      const users: StoredUser[] = raw ? JSON.parse(raw) : [];

      // 2) 중복 체크(이메일 기준)
      const emailLower = email.trim().toLowerCase();
      if (users.some(u => u.email?.toLowerCase() === emailLower)) {
        Alert.alert('회원가입 실패', '이미 가입된 이메일입니다.');
        setLoading(false);
        return;
      }

      // 3) 신규 유저 저장
      const newUser: StoredUser = {
        email: emailLower,               // ✅ 표준화: 소문자 저장
        name: name.trim(),
        department: department.trim(),
        studentId: studentId.trim(),     // ✅ 저장
        nickname: nickname.trim(),
        password, // ⚠️ 프로토타입
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify([newUser, ...users]));

      // 4) 세션 키도 저장 (다른 화면에서 즉시 조회용)
      await AsyncStorage.multiSet([
        [AUTH_EMAIL_KEY, newUser.email],
        ['auth_user_email', newUser.email], // ✅ 호환 키도 같이
        [AUTH_NAME_KEY, newUser.name],
        [AUTH_NICKNAME_KEY, newUser.nickname],
        [AUTH_STUDENT_ID_KEY, newUser.studentId ?? ''],
        [AUTH_DEPT_KEY, newUser.department ?? ''],
      ]);

      Alert.alert('완료', '회원가입이 완료되었습니다. 로그인 해주세요.');
      navigation.navigate('Login');
    } catch (e) {
      console.error('signup error', e);
      Alert.alert('오류', '회원가입 처리 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={require('../../assets/images/back.png')} style={styles.backIcon} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>회원가입</Text>
        </View>

        <Text style={styles.sectionTitle}>본인인증하기</Text>

        {/* 이메일 */}
        <Text style={styles.label}>이메일</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, opacity: isVerified ? 0.6 : 1 }]}
            placeholder="abc@yiu.ac.kr (모의 단계: 아무거나 가능)"
            value={email}
            onChangeText={setEmail}
            editable={!isVerified}                 // 인증 완료 후 수정 잠금
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
            blurOnSubmit={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.subButton, { opacity: isVerified ? 0.5 : 1 }]}
            onPress={handleRequestCode}
            disabled={isVerified}
          >
            <Text style={styles.subButtonText}>{codeSent ? '재요청' : '인증요청'}</Text>
          </TouchableOpacity>
        </View>

        {/* 인증번호 */}
        <Text style={styles.label}>인증번호</Text>
        <View style={styles.row}>
          <TextInput
            ref={codeRef}
            style={[styles.input, { flex: 1, opacity: isVerified ? 0.6 : 1 }]}
            placeholder="인증번호 6자리 (예: 123456)"
            value={code}
            onChangeText={setCode}
            editable={!isVerified}
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => nameRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.subButton, { opacity: isVerified ? 0.5 : 1 }]}
            onPress={handleVerifyCode}
            disabled={isVerified}
          >
            <Text style={styles.subButtonText}>인증확인</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>필수정보입력</Text>

        {/* 이름 */}
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

        {/* 학과 */}
        <Text style={styles.label}>학과</Text>
        <TextInput
          ref={deptRef}
          style={styles.input}
          placeholder="전공 학과"
          value={department}
          onChangeText={setDepartment}
          returnKeyType="next"
          onSubmitEditing={() => studentIdRef.current?.focus()}   // ✅ 다음은 학번
        />

        {/* ✅ 학번 */}
        <Text style={styles.label}>학번</Text>
        <TextInput
          ref={studentIdRef}
          style={styles.input}
          placeholder="예: 201955001"
          value={studentId}
          onChangeText={setStudentId}
          keyboardType="number-pad"
          returnKeyType="next"
          onSubmitEditing={() => nickRef.current?.focus()}        // 다음은 닉네임
        />

        {/* 닉네임 */}
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

        {/* 비밀번호 */}
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          ref={passRef}
          style={styles.input}
          placeholder="비밀번호 (영문/숫자/특수문자, 8자 이상)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
          onSubmitEditing={() => passCheckRef.current?.focus()}
        />

        {/* 비밀번호 확인 */}
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
            <Image source={require('../../assets/images/correct.png')} style={styles.correctIcon} resizeMode="contain" />
          )}
        </View>

        {/* 가입 버튼 */}
        <TouchableOpacity
          style={[styles.signUpButton, { backgroundColor: isFormValid && !loading ? '#0035A4' : '#ccc' }]}
          disabled={!isFormValid || loading}
          onPress={handleSignUp}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpButtonText}>회원가입</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
