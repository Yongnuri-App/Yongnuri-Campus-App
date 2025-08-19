// pages/SignUp/SignUpPage.tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { RootStackParamList } from '../../types/navigation';
import styles from './SignUpPage.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignUpPage({ navigation }: Props) {
  // ✅ 입력 상태
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');

  const handleSignUp = () => {
    // TODO: 회원가입 API 연결
    console.log('회원가입 시도:', {
      email,
      code,
      name,
      department,
      nickname,
      password,
      passwordCheck,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        {/* 뒤로가기 + 제목 */}
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

        {/* 본인인증하기 */}
        <Text style={styles.sectionTitle}>본인인증하기</Text>

        {/* 이메일 */}
        <Text style={styles.label}>이메일</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="abc@yiu.ac.kr"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonText}>인증요청</Text>
          </TouchableOpacity>
        </View>

        {/* 인증번호 */}
        <Text style={styles.label}>인증번호</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="인증번호 6자리"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonText}>인증확인</Text>
          </TouchableOpacity>
        </View>

        {/* 필수정보입력 */}
        <Text style={styles.sectionTitle}>필수정보입력</Text>

        {/* 이름 */}
        <Text style={styles.label}>이름</Text>
        <TextInput
          style={styles.input}
          placeholder="홍길동"
          value={name}
          onChangeText={setName}
        />

        {/* 학과 */}
        <Text style={styles.label}>학과</Text>
        <TextInput
          style={styles.input}
          placeholder="전공 학과"
          value={department}
          onChangeText={setDepartment}
        />

        {/* 닉네임 */}
        <Text style={styles.label}>닉네임</Text>
        <TextInput
          style={styles.input}
          placeholder="닉네임"
          value={nickname}
          onChangeText={setNickname}
        />

        {/* 비밀번호 */}
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (영문/숫자/특수문자)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        {/* 비밀번호 확인 */}
        <View style={styles.inputWrapper}>
        <TextInput
            style={styles.input}
            placeholder="비밀번호 확인"
            secureTextEntry
            value={passwordCheck}
            onChangeText={setPasswordCheck}
        />
        {/* 입력값이 일치하면 correct.png를 인풋 오른쪽 안에 표시 */}
        {passwordCheck.length > 0 && passwordCheck === password && (
            <Image
            source={require('../../assets/images/correct.png')}
            style={styles.correctIcon}
            resizeMode="contain"
            />
        )}
        </View>

        {/* 회원가입 버튼 */}
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>회원가입</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
