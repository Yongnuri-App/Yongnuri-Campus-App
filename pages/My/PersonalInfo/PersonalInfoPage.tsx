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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styles from './PersonalInfoPage.styles';
import { authApi } from '../../../api/auth';
import { setAuthToken } from '../../../api/client';
import { getProfileByEmail } from '../../../utils/session';

const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';
const AUTH_EMAIL_KEY = 'auth_email';

const ACCESS_TOKEN_KEY = 'access_token';
const AUTH_TOKEN_KEY_FALLBACK = 'auth_token';
const USERS_ALL_KEY = 'users_all_v1';

const MAX_NICKNAME = 6;
const clampNickname = (text: string) =>
  Array.from(text).slice(0, MAX_NICKNAME).join('');

const isSame = (a?: string | null, b?: string | null) =>
  (a ?? '').trim() !== '' &&
  (b ?? '').trim() !== '' &&
  (a ?? '').trim() === (b ?? '').trim();

export default function PersonalInfoPage() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('000');
  const [studentId, setStudentId] = useState('');
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /** 서버에서 내 정보 가져오기 */
  const fetchMyInfo = async () => {
    try {
      setLoading(true);

      // 로컬 현재값
      const [[, localName], [, localStu], [, localNick], [, localEmail]] =
        await AsyncStorage.multiGet([
          AUTH_NAME_KEY,
          AUTH_STUDENT_ID_KEY,
          AUTH_NICKNAME_KEY,
          AUTH_EMAIL_KEY,
        ]);

      // 토큰 세팅
      const [tokNew, tokOld] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY_FALLBACK),
      ]);
      const token = tokNew || tokOld || '';
      if (!token) {
        Alert.alert('안내', '로그인이 필요합니다.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setAuthToken(token);

      // 호출
      console.log('[MYPAGE] ▶ GET /mypage');
      const res = await authApi.mypage();
      console.log('[MYPAGE] ◀', res?.status, res?.data);
      const data = res?.data ?? {};

      // 응답 파싱
      const srvName: string = (data.name ?? '').toString();
      const srvNickFromServer: string = (data.nickName ?? data.nickname ?? '').toString();
      const emailNow = (localEmail ?? data.email ?? '').toString();
      if (emailNow) setEmail(emailNow);

      // 학번: 서버 → 이메일 숫자 → 로컬
      const localPart = emailNow.split('@')[0] ?? '';
      const srvStudentIdRaw =
        data.studentId ?? data.studentID ?? data.stdNo ?? data.id ?? '';
      const srvStu = srvStudentIdRaw == null ? '' : String(srvStudentIdRaw);
      const fromEmailDigits = (localPart.match(/\d+/)?.[0] ?? '');
      const isLikely = (v: string) => v && v.length >= 6;
      const nextStudentId = isLikely(srvStu)
        ? srvStu
        : isLikely(fromEmailDigits)
        ? fromEmailDigits
        : (localStu ?? '');

      // users_all_v1의 닉네임
      let nickFromUsersAll = '';
      if (emailNow) {
        try {
          const p = await getProfileByEmail(emailNow);
          if (p?.nickname) nickFromUsersAll = String(p.nickname);
        } catch { /* noop */ }
      }

      // 닉네임 후보 (서버 1순위, '이름과 같은 값'은 오염으로 버림)
      const cleaned = (s?: string | null) => (s ?? '').trim();
      const nameForCompare = (srvName || localName || '').toString().trim();
      const cServer = cleaned(srvNickFromServer);
      const cUsersAll = cleaned(nickFromUsersAll);
      const cLocal = cleaned(localNick);

      const candidates = [
        cServer && !isSame(cServer, nameForCompare) ? cServer : '',
        cUsersAll && !isSame(cUsersAll, nameForCompare) ? cUsersAll : '',
        cLocal && !isSame(cLocal, nameForCompare) ? cLocal : '',
      ];
      const nextNickname = candidates.find(v => v !== '') || '';

      // 상태 반영
      const nextName = cleaned(srvName) || cleaned(localName) || '000';
      setName(nextName);
      setStudentId(String(nextStudentId));
      setNickname(nextNickname);
      setOriginalNickname(nextNickname);

      // 로컬 캐시 (빈값으로 덮지 않기)
      const writes: [string, string][] = [
        [AUTH_NAME_KEY, nextName],
        [AUTH_STUDENT_ID_KEY, String(nextStudentId)],
      ];
      if (nextNickname) writes.push([AUTH_NICKNAME_KEY, nextNickname]);
      await AsyncStorage.multiSet(writes);

      // users_all_v1 업데이트
      try {
        const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
        const arr = raw ? (JSON.parse(raw) as any[]) : [];
        const idx = arr.findIndex(
          (u: any) => u.email?.toLowerCase() === (emailNow ?? '').toLowerCase()
        );
        if (idx >= 0) {
          arr[idx] = {
            ...arr[idx],
            name: nextName || arr[idx].name,
            studentId: nextStudentId || arr[idx].studentId,
            nickname: nextNickname || arr[idx].nickname,
            department: data.major ?? arr[idx].department,
          };
          await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(arr));
        }
      } catch (e) {
        console.log('users_all sync skip', e);
      }
    } catch (e: any) {
      console.log('[MYPAGE] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      if (e?.response?.status === 401) {
        Alert.alert('안내', '로그인이 만료되었습니다.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        Alert.alert('오류', e?.response?.data?.message ?? '내 정보 조회 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  /** 초기 로드: 로컬 먼저 → 서버 싱크 */
  useEffect(() => {
    (async () => {
      try {
        const [[, n], [, s], [, nn], [, em]] = await AsyncStorage.multiGet([
          AUTH_NAME_KEY,
          AUTH_STUDENT_ID_KEY,
          AUTH_NICKNAME_KEY,
          AUTH_EMAIL_KEY,
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
        console.log('personal-info local load error', e);
      } finally {
        fetchMyInfo();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 닉네임 저장 → POST /mypage */
  const onSave = async () => {
    const nextNick = nickname.trim();
    if (!nextNick) {
      Alert.alert('안내', '닉네임을 입력해주세요.');
      return;
    }
    if (saving) return;

    try {
      setSaving(true);

      // 토큰
      const [tokNew, tokOld] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY_FALLBACK),
      ]);
      const token = tokNew || tokOld || '';
      if (!token) {
        Alert.alert('안내', '로그인이 필요합니다.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      // 헤더 Authorization 유지
      setAuthToken(token);

      // 명세 충족: body에 accessToken + nickName
      const body = { accessToken: token, nickName: nextNick };
      console.log('[MYPAGE][UPDATE] ▶ POST /mypage', body);
      const res = await authApi.updateMypage(body);
      console.log('[MYPAGE][UPDATE] ◀', res?.status, res?.data);

      // 로컬 반영
      await AsyncStorage.setItem(AUTH_NICKNAME_KEY, nextNick);
      // users_all_v1 업데이트
      const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      const idx = arr.findIndex((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], nickname: nextNick };
        await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(arr));
      }

      setOriginalNickname(nextNick);
      Alert.alert('완료', '닉네임이 저장되었습니다.');
    } catch (e: any) {
      console.log('[MYPAGE][UPDATE] ✖ error', {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const msg =
        e?.response?.data?.message ??
        (e?.response?.status ? `저장 실패 (HTTP ${e.response.status})` : '네트워크 오류가 발생했습니다.');
      Alert.alert('실패', msg);
    } finally {
      setSaving(false);
    }
  };

  const goPasswordReset = () => navigation.navigate('PasswordReset');

  const onLogout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_TOKEN_KEY_FALLBACK),
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
          <Image
            source={require('../../../assets/images/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 정보</Text>
        {/* 🔥 새로고침 버튼 제거 */}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
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
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, (isNicknameChanged && !saving) && styles.primaryButtonActive]}
          onPress={onSave}
          activeOpacity={0.9}
          disabled={!isNicknameChanged || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>완료</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
