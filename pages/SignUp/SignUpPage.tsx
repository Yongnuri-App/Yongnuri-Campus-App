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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import styles from './SignUpPage.styles';
import { authApi } from '../../api/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const MAX_NICKNAME = 6;
const clampNickname = (text: string) => Array.from(text).slice(0, MAX_NICKNAME).join('');

// 🧪 닉네임에서 숫자 제거할지 여부 (에러 계속나면 true로 바꿔서 즉시 우회 테스트)
const STRIP_DIGITS_IN_NICKNAME = false;

export default function SignUpPage({ navigation }: Props) {
  // 입력값
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState(''); // 사용자가 전공명이나 전공코드(숫자) 중 하나를 입력
  const [studentId, setStudentId] = useState('');   // 숫자만 허용
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');

  // 상태
  const [isFormValid, setIsFormValid] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // 버튼별 로딩
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);

  // 포커스
  const codeRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const deptRef = useRef<TextInput>(null);
  const studentIdRef = useRef<TextInput>(null);
  const nickRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const passCheckRef = useRef<TextInput>(null);

  // 비밀번호 규칙
  const isPasswordValid = (value: string) =>
    /^[A-Za-z0-9!@#$%^&*()_+{}\[\]:;<>,.?/~\\-]{8,}$/.test(value);

  // 학번 자릿수(원하면 조정)
  const MIN_STUDENT_ID_LEN = 6;

  useEffect(() => {
    const filled =
      email.trim() !== '' &&
      isVerified &&
      name.trim() !== '' &&
      department.trim() !== '' &&
      studentId.trim() !== '' && // 학번 필수
      nickname.trim() !== '' &&
      nickname.length <= MAX_NICKNAME &&
      isPasswordValid(password) &&
      password === passwordCheck;

    setIsFormValid(filled);
  }, [email, isVerified, name, department, studentId, nickname, password, passwordCheck]);

  // (1) 인증요청 — 이메일로 6자리 코드 발송
  const handleRequestCode = async () => {
    const em = email.trim();
    if (!em) {
      Alert.alert('안내', '이메일을 입력해주세요.');
      return;
    }
    if (loadingEmail) return;

    try {
      setLoadingEmail(true);
      console.log('[AUTH][EMAIL] ▶ request', { email: em });

      const res = await authApi.requestEmailCode({ email: em });
      console.log('[AUTH][EMAIL] ◀ response', { status: res?.status, data: res?.data });

      setCodeSent(true);
      Alert.alert('인증요청 완료', '입력한 이메일로 5자리 인증코드를 보냈습니다.\n메일함을 확인해주세요.');
      setTimeout(() => codeRef.current?.focus(), 120);
    } catch (e: any) {
      console.log('[AUTH][EMAIL] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const msg =
        e?.response?.data?.message ??
        (e?.response?.status ? `코드 전송에 실패했습니다. (HTTP ${e.response.status})` : '네트워크 오류가 발생했습니다.');
      Alert.alert('실패', msg);
    } finally {
      setLoadingEmail(false);
    }
  };

  // (2) 인증 확인 — 코드 검증
  const handleVerifyCode = async () => {
    if (!codeSent) {
      Alert.alert('안내', '먼저 인증요청을 눌러주세요.');
      return;
    }
    if (loadingVerify) return;

    try {
      setLoadingVerify(true);
      const payload = { email: email.trim(), number: code.trim() };
      console.log('[AUTH][VERIFY] ▶ request', payload);

      const res = await authApi.verifyEmailCode(payload);
      console.log('[AUTH][VERIFY] ◀ response', { status: res?.status, data: res?.data });

      setIsVerified(true);
      Alert.alert('인증 완료', '이메일 인증이 완료되었습니다.');
      setTimeout(() => nameRef.current?.focus(), 120);
    } catch (e: any) {
      console.log('[AUTH][VERIFY] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      Alert.alert('인증 실패', e?.response?.data?.message ?? '인증번호가 올바르지 않습니다.');
    } finally {
      setLoadingVerify(false);
    }
  };

  // (3) 회원가입 — 안전 매핑(major/majorId) + 학번 숫자 + 닉네임 옵션 처리
  const handleSignUp = async () => {
    if (!isFormValid || loadingJoin) return;

    // 학번 숫자만 허용 + 최소 자릿수 체크
    const sidDigits = studentId.replace(/\D/g, '');
    const sidNum = Number(sidDigits);
    if (!sidDigits || Number.isNaN(sidNum) || sidDigits.length < MIN_STUDENT_ID_LEN) {
      Alert.alert('안내', `학번은 숫자만 입력해주세요. (최소 ${MIN_STUDENT_ID_LEN}자리)`);
      return;
    }

    // 전공 입력이 숫자이면 majorId 로, 아니면 major 로 보냄
    const dept = department.trim();
    const deptDigits = dept.replace(/\D/g, '');
    const deptNum = deptDigits ? Number(deptDigits) : NaN;
    const useMajorId = deptDigits.length === dept.length && !Number.isNaN(deptNum); // 전부 숫자면 코드로 판단

    // 닉네임: 기본은 그대로, 필요 시 숫자 제거 토글
    const rawNick = clampNickname(nickname.trim());
    const safeNick = STRIP_DIGITS_IN_NICKNAME ? rawNick.replace(/\d/g, '') : rawNick;

    try {
      setLoadingJoin(true);

      const base: any = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        nickname: safeNick,
        password,
        passwordCheck,
        studentId: sidNum, // ✅ 정수
      };

      if (useMajorId) {
        base.majorId = deptNum; // ✅ 정수 코드
      } else {
        base.major = dept;      // ✅ 텍스트 전공명
      }

      console.log('[AUTH][JOIN] ▶ request', {
        ...base,
        password: '***',
        passwordCheck: '***',
      });

      const res = await authApi.join(base);
      console.log('[AUTH][JOIN] ◀ response', { status: res?.status, data: res?.data });

      Alert.alert('완료', '회원가입이 완료되었습니다. 로그인 해주세요.');
      navigation.navigate('Login');
    } catch (e: any) {
      console.log('[AUTH][JOIN] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });

      // Jackson NumberFormatException 메시지를 바로 띄워 원인 파악 빠르게
      const rawMsg: string | undefined = e?.response?.data?.message;
      let msg =
        rawMsg ??
        (e?.response?.status
          ? `회원가입 실패 (HTTP ${e.response.status})`
          : '네트워크 오류가 발생했습니다.');

      // 진단 힌트 추가
      if (rawMsg?.includes('For input string')) {
        msg += '\n\n(용인대 이메일로만 가입이 가능합니다. 다시 확인해 주세요.)';
      }

      Alert.alert('가입 실패', msg);
    } finally {
      setLoadingJoin(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={loadingEmail || loadingVerify || loadingJoin}
          >
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>회원가입</Text>
        </View>

        <Text style={styles.sectionTitle}>본인인증하기</Text>

        {/* 이메일 */}
        <Text style={styles.label}>이메일</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, opacity: isVerified ? 0.6 : 1 }]}
            placeholder="abc@yiu.ac.kr"
            value={email}
            onChangeText={setEmail}
            editable={!isVerified && !loadingEmail && !loadingVerify && !loadingJoin}
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
            blurOnSubmit={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.subButton, { opacity: isVerified ? 0.5 : 1 }]}
            onPress={handleRequestCode}
            disabled={isVerified || loadingEmail || loadingVerify || loadingJoin}
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
            editable={!isVerified && !loadingVerify && !loadingJoin}
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => nameRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.subButton, { opacity: isVerified ? 0.5 : 1 }]}
            onPress={handleVerifyCode}
            disabled={isVerified || loadingVerify || loadingJoin}
          >
            {loadingVerify ? <ActivityIndicator /> : <Text style={styles.subButtonText}>인증확인</Text>}
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
          editable={!loadingJoin}
        />

        {/* 학과 */}
        <Text style={styles.label}>학과</Text>
        <TextInput
          ref={deptRef}
          style={styles.input}
          placeholder="전공 학과 (또는 전공코드 숫자)"
          value={department}
          onChangeText={setDepartment}
          returnKeyType="next"
          onSubmitEditing={() => studentIdRef.current?.focus()}
          editable={!loadingJoin}
        />

        {/* 학번 */}
        <Text style={styles.label}>학번</Text>
        <TextInput
          ref={studentIdRef}
          style={styles.input}
          placeholder="예: 201955001"
          value={studentId}
          onChangeText={(t) => setStudentId(t.replace(/\D/g, ''))} // 🔒 숫자만 유지
          keyboardType="number-pad"
          returnKeyType="next"
          onSubmitEditing={() => nickRef.current?.focus()}
          editable={!loadingJoin}
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
          editable={!loadingJoin}
        />

        {/* 비밀번호 */}
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          ref={passRef}
          style={styles.input}
          placeholder="영문/숫자/특수문자, 8자 이상"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
          onSubmitEditing={() => passCheckRef.current?.focus()}
          editable={!loadingJoin}
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
            editable={!loadingJoin}
          />
          {passwordCheck.length > 0 && passwordCheck === password && (
            <Image
              source={require('../../assets/images/correct.png')}
              style={styles.correctIcon}
              resizeMode="contain"
            />
          )}
        </View>

        {/* 가입 버튼 */}
        <TouchableOpacity
          style={[
            styles.signUpButton,
            { backgroundColor: isFormValid && !loadingJoin ? '#0035A4' : '#ccc' },
          ]}
          disabled={!isFormValid || loadingJoin}
          onPress={handleSignUp}
        >
          {loadingJoin ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpButtonText}>회원가입</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
