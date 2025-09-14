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

/** 로그인/회원가입 시 저장해둔 키 (프로젝트에 맞게 필요 시 조정) */
const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';
const AUTH_TOKEN_KEY = 'auth_token'; // 예: 토큰/세션키가 있다면 함께 제거

/** 닉네임 최대 글자 수 */
const MAX_NICKNAME = 6;
/** 이모지/합자 고려한 안전 자르기 */
const clampNickname = (text: string) => Array.from(text).slice(0, MAX_NICKNAME).join('');

export default function PersonalInfoPage() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('000');
  const [studentId, setStudentId] = useState('202178010');
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState(''); // 원래 닉네임 (비교용)

  /** 초기 로드: 이름/학번/닉네임 불러오기 */
  useEffect(() => {
    (async () => {
      try {
        const [n, s, nn] = await Promise.all([
          AsyncStorage.getItem(AUTH_NAME_KEY),
          AsyncStorage.getItem(AUTH_STUDENT_ID_KEY),
          AsyncStorage.getItem(AUTH_NICKNAME_KEY),
        ]);
        if (n) setName(n);
        if (s) setStudentId(s);
        if (nn) {
          setNickname(nn);
          setOriginalNickname(nn);
        } else {
          setOriginalNickname('');
        }
      } catch (e) {
        console.log('personal-info load error', e);
      }
    })();
  }, []);

  /** 닉네임 저장 */
  const onSave = async () => {
    try {
      await AsyncStorage.setItem(AUTH_NICKNAME_KEY, nickname.trim());
      Alert.alert('완료', '닉네임이 저장되었습니다.');
      // 저장 후 원본 기준도 갱신 → 버튼 색상 원복
      setOriginalNickname(nickname.trim());
    } catch (e) {
      console.error('닉네임 저장 실패', e);
    }
  };

  /** 비밀번호 변경 */
  const goPasswordReset = () => {
    navigation.navigate('PasswordReset'); // 네비게이터에 등록된 라우트명과 일치해야 함
  };

  /** 로그아웃 */
  const onLogout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_NAME_KEY),
        AsyncStorage.removeItem(AUTH_STUDENT_ID_KEY),
        // 닉네임 유지하려면 아래 라인은 주석 유지, 지우려면 주석 해제
        // AsyncStorage.removeItem(AUTH_NICKNAME_KEY),
      ]);
    } catch (e) {
      console.log('logout error', e);
    } finally {
      // 스택 초기화 후 로그인 화면으로
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  /** 닉네임 변경 여부 → 버튼 색상 제어 */
  const isNicknameChanged = useMemo(
    () => nickname.trim() !== (originalNickname ?? ''),
    [nickname, originalNickname]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 상태바 높이 */}
      <View style={styles.statusBar} />

      {/* 헤더: 뒤로가기 + 타이틀 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Image
            source={require('../../../assets/images/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 상단 섹션 타이틀 */}
        <Text style={styles.sectionCaption}>회원 정보 수정</Text>

        {/* 이름 (읽기 전용) */}
        <Text style={styles.fieldLabelMuted}>이름</Text>
        <Text style={styles.readonlyValue}>{name}</Text>
        <View style={styles.divider} />

        {/* 학번 (읽기 전용) */}
        <Text style={styles.fieldLabelMuted}>학번</Text>
        <Text style={styles.readonlyValue}>{studentId}</Text>
        <View style={styles.divider} />

        {/* 닉네임 (수정 가능, 최대 6자) */}
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

        {/* 회색 섹션 구분 바들 (피그마 Rectangle 445 / 443) */}
        <View style={[styles.grayStrip, { marginTop: 40 }]} />

        {/* 액션 라인: 비밀번호 변경 / 로그아웃 */}
        <TouchableOpacity style={styles.actionRow} onPress={goPasswordReset} activeOpacity={0.85}>
          <Text style={styles.actionText}>비밀번호 변경</Text>
        </TouchableOpacity>

        <View style={[styles.grayStrip, { marginTop: 12 }]} />

        <TouchableOpacity style={styles.actionRow} onPress={onLogout} activeOpacity={0.85}>
          <Text style={styles.actionText}>로그아웃</Text>
        </TouchableOpacity>

        {/* 스크롤 하단 여백: 고정 버튼에 가리지 않도록 충분히 확보 */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ✅ 하단 고정 완료 버튼 */}
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
