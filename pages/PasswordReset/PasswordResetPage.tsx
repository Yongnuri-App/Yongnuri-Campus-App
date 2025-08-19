// pages/PasswordReset/PasswordResetPage.tsx
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
import styles from './PasswordResetPage.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordReset'>;

export default function PasswordResetPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');

  const handleReset = () => {
    // TODO: 비밀번호 재설정 API 연결
    console.log('비밀번호 재설정 시도:', {
      email,
      code,
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

        {/* 비밀번호 재설정 */}
        <Text style={styles.sectionTitle}>비밀번호 재설정</Text>

        {/* 새 비밀번호 */}
        <Text style={styles.label}>새 비밀번호</Text>
        <TextInput
          style={styles.input}
          placeholder="영문, 숫자, 특수문자 포함 8자 이상"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* 새 비밀번호 확인 */}
        <Text style={styles.label}>새 비밀번호 확인</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
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
        <TouchableOpacity style={styles.signUpButton} onPress={handleReset}>
          <Text style={styles.signUpButtonText}>완료</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
