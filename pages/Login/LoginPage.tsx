// pages/Login/LoginPage.tsx
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// 공용 네비 타입 가져오기
import { RootStackParamList } from '../../types/navigation';
import styles from './LoginPage.styles';

const { width } = Dimensions.get('window');

// ✅ 공용 타입을 사용해 Props 지정
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginPage({ navigation }: Props) {
  // ✅ 입력 상태 (이메일/비밀번호)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // ✅ 로그인 버튼 클릭 핸들러
  const onPressLogin = () => {
    // TODO: 실제 로그인 API 연동
    console.log('로그인 시도:', { email, password });
  };

  return (
    // ✅ 키보드가 올라올 때 인풋이 가려지지 않도록 처리 (iOS padding / Android height)
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      {/* ✅ 빈 영역 터치 시 키보드 닫기 */}
      <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
        {/* 로고 */}
        <Image
          source={require('../../assets/images/yongnuri-icon.png')}
          style={styles.logo}
          resizeMode="contain"
          accessible
          accessibilityLabel="Yongnuri Campus 로고"
        />

        {/* ✅ 제목 (피그마: 28, Bold, #395884) */}
        <Text style={styles.title}>Yongnuri Campus</Text>

        {/* ✅ 부제 (피그마: 12, Medium, #979797, 중앙정렬) */}
        <Text style={styles.subtitle}>
          용누리 캠퍼스와 함께하는 용인대학교 생활 :)
        </Text>

        {/* ✅ 이메일 입력 */}
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          // iOS에서 비밀번호 다음으로 이동할 때 UX 좋게
          onSubmitEditing={() => {
            // 비밀번호로 포커스 넘기고 싶다면 ref 사용
          }}
          accessible
          accessibilityLabel="이메일 입력"
        />

        {/* ✅ 비밀번호 입력 */}
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={onPressLogin}
          accessible
          accessibilityLabel="비밀번호 입력"
        />

        {/* ✅ 로그인 버튼 (피그마: 320x48, 라운드 50, 배경 #395884, 텍스트 #FFF) */}
        <TouchableOpacity style={styles.loginButton} onPress={onPressLogin} activeOpacity={0.8}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>

        {/* ✅ 하단 링크 (회원가입 | 비밀번호 재설정) */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.linkText}>회원가입</Text>
          </TouchableOpacity>

          {/* 구분선  */}
          <View style={styles.divider} />

          <TouchableOpacity onPress={() => navigation.navigate('PasswordReset')}>
            <Text style={styles.linkText}>비밀번호 재설정</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}