// pages/My/PersonalInfo/PersonalInfoPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styles from './PersonalInfoPage.styles';

const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_EMAIL_KEY = 'auth_email';

const USERS_ALL_KEY = 'users_all_v1';

const MAX_NICKNAME = 6;
const clampNickname = (text: string) => Array.from(text).slice(0, MAX_NICKNAME).join('');

export default function PersonalInfoPage() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('000');
  const [studentId, setStudentId] = useState(''); // 빈값 가능
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [email, setEmail] = useState('');

  /** 초기 로드 */
  useEffect(() => {
    (async () => {
      try {
        const [[, n], [, s], [, nn], [, em]] = await AsyncStorage.multiGet([
          AUTH_NAME_KEY, AUTH_STUDENT_ID_KEY, AUTH_NICKNAME_KEY, AUTH_EMAIL_KEY,
        ]);
        if (n) setName(n);
        if (s) setStudentId(s);
        if (nn) {
          setNickname(nn);
          setOriginalNickname(nn);
        } else {
          setOriginalNickname('');
        }
        if (em) setEmail(em);
      } catch (e) {
        console.log('personal-info load error', e);
      }
    })();
  }, []);

  /** 닉네임 저장 (+ 유저DB 업데이트) */
  const onSave = async () => {
    try {
      const nextNick = nickname.trim();
      await AsyncStorage.setItem(AUTH_NICKNAME_KEY, nextNick);

      // 로컬 유저DB 업데이트
      const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      const idx = arr.findIndex(u => u.email?.toLowerCase() === email.toLowerCase());
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], nickname: nextNick };
        await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(arr));
      }

      Alert.alert('완료', '닉네임이 저장되었습니다.');
      setOriginalNickname(nextNick);
    } catch (e) {
      console.error('닉네임 저장 실패', e);
    }
  };

  const goPasswordReset = () => navigation.navigate('PasswordReset');

  const onLogout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_NAME_KEY),
        AsyncStorage.removeItem(AUTH_STUDENT_ID_KEY),
        // AsyncStorage.removeItem(AUTH_NICKNAME_KEY), // 닉네임 유지하려면 주석 유지
        AsyncStorage.removeItem(AUTH_EMAIL_KEY),
      ]);
    } catch (e) {
      console.log('logout error', e);
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const isNicknameChanged = useMemo(
    () => nickname.trim() !== (originalNickname ?? ''),
    [nickname, originalNickname]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Image source={require('../../../assets/images/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionCaption}>회원 정보 수정</Text>

        <Text style={styles.fieldLabelMuted}>이름</Text>
        <Text style={styles.readonlyValue}>{name}</Text>
        <View style={styles.divider} />

        <Text style={styles.fieldLabelMuted}>학번</Text>
        <Text style={styles.readonlyValue}>{studentId || '-'}</Text>
        <View style={styles.divider} />

        <Text style={styles.fieldLabelMuted}>닉네임</Text>
        <TextInput
          value={nickname}
          onChangeText={(t) => setNickname(clampNickname(t))}
          placeholder="닉네임을 입력하세요"
          placeholderTextColor="#BDBDBD"
          style={styles.input}
          maxLength={MAX_NICKNAME}
          returnKeyType="done"
        />

        <View style={[styles.grayStrip, { marginTop: 40 }]} />

        <TouchableOpacity style={styles.actionRow} onPress={goPasswordReset} activeOpacity={0.85}>
          <Text style={styles.actionText}>비밀번호 변경</Text>
        </TouchableOpacity>

        <View style={[styles.grayStrip, { marginTop: 12 }]} />

        <TouchableOpacity style={styles.actionRow} onPress={onLogout} activeOpacity={0.85}>
          <Text style={styles.actionText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isNicknameChanged && styles.primaryButtonActive]}
          onPress={onSave}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>완료</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
