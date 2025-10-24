import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import styles from './MyPage.styles';
import { api } from '../../../api/client';

const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';

const TOKEN_KEYS = ['accessToken', 'access_token'];
async function getAccessToken(): Promise<string | null> {
  for (const k of TOKEN_KEYS) {
    const v = await AsyncStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export default function MyPagePage() {
  const navigation = useNavigation<any>();
  const [nickname, setNickname] = useState('');
  const [studentId, setStudentId] = useState('');
  const lastTokenRef = useRef<string | null>(null);

  const loadFromCache = useCallback(async () => {
    try {
      const [[, nn], [, sid]] = await AsyncStorage.multiGet([
        AUTH_NICKNAME_KEY,
        AUTH_STUDENT_ID_KEY,
      ]);
      if (nn) setNickname(nn);
      if (sid) setStudentId(sid);
    } catch (e) {
      console.log('mypage cache load error', e);
    }
  }, []);

  const fetchFromServer = useCallback(async () => {
    try {
      const { data } = await api.get('/mypage/page'); // { nickName: string, studentId: string }
      // ⚠️ 서버가 nickName(카멜 중간 대문자)로 내려줌. nickname 도 백워드 대응.
      const serverNickname = String(data?.nickName ?? data?.nickname ?? '');
      const serverSid = String(data?.studentId ?? '');

      // 값이 있을 때만 상태/스토리지 갱신 (깜박임/덮어쓰기 방지)
      if (serverNickname) setNickname(serverNickname);
      if (serverSid) setStudentId(serverSid);

      await AsyncStorage.multiSet([
        [AUTH_NICKNAME_KEY, serverNickname || ''],
        [AUTH_STUDENT_ID_KEY, serverSid || ''],
        [AUTH_NAME_KEY, serverNickname || ''], // 호환 키에도 닉네임 저장
      ]);

      console.log('[MYPAGE] set', { serverNickname, serverSid });
    } catch (e) {
      console.log('mypage fetch error', e);
      // 실패 시 캐시라도 표시
      await loadFromCache();
    }
  }, [loadFromCache]);

  const ensureFreshForCurrentAccount = useCallback(async () => {
    const token = await getAccessToken();
    const changed = token !== lastTokenRef.current;
    if (changed) {
      lastTokenRef.current = token;
      // 다른 계정으로 전환된 경우, 먼저 캐시 비우고 새로 가져옴
      await AsyncStorage.multiRemove([AUTH_NICKNAME_KEY, AUTH_STUDENT_ID_KEY, AUTH_NAME_KEY]);
      setNickname('');
      setStudentId('');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await ensureFreshForCurrentAccount();
      // 캐시 띄우고 → 서버로 최신화
      await loadFromCache();
      await fetchFromServer();
    })();
  }, [ensureFreshForCurrentAccount, loadFromCache, fetchFromServer]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!alive) return;
        await ensureFreshForCurrentAccount();
        await fetchFromServer();
      })();
      return () => { alive = false; };
    }, [ensureFreshForCurrentAccount, fetchFromServer])
  );

  const displayName = nickname || '사용자';
  const displayStudentId = studentId || '-';

  const onPressAlarm = () => navigation.navigate('Notification');
  const onPressSearch = () => navigation.navigate('Search');

  const goPersonalInfo = () => navigation.navigate('MyPersonalInfo');
  const goFavorites = () => navigation.navigate('MyFavorites');
  const goBlockedUsers = () => navigation.navigate('MyBlockedUsers');
  const goTradeHistory = () => navigation.navigate('MyTradeHistory');
  const goInquiry = () => navigation.navigate('MyInquiry');
  const goWithdraw = () => navigation.navigate('MyWithdraw');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onPressSearch} activeOpacity={0.9}>
            <Image source={require('../../../assets/images/search.png')} style={styles.headerIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onPressAlarm} activeOpacity={0.9}>
            <Image source={require('../../../assets/images/bell.png')} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.greetingWrap} activeOpacity={0.85} onPress={goPersonalInfo}>
          <View style={styles.greetingTextCol}>
            <Text style={styles.greeting}>{displayName}님 안녕하세요!</Text>
            <Text style={styles.subId}>{displayStudentId} 학번</Text>
          </View>
          <Image source={require('../../../assets/images/arrow.png')} style={styles.greetingArrow} />
        </TouchableOpacity>

        <View style={styles.dividerTop} />
        <Text style={styles.sectionCaption}>나의 거래</Text>

        <TouchableOpacity style={styles.row} onPress={goFavorites} activeOpacity={0.85}>
          <Text style={styles.rowText}>관심 목록</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goBlockedUsers} activeOpacity={0.85} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={styles.sectionTitle}>차단한 사용자</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={goTradeHistory} activeOpacity={0.85}>
          <Text style={styles.rowText}>거래 내역</Text>
        </TouchableOpacity>

        <View style={styles.dividerMid} />
        <Text style={styles.sectionCaption}>기타</Text>

        <TouchableOpacity style={styles.row} onPress={goInquiry} activeOpacity={0.85}>
          <Text style={styles.rowText}>문의하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={goWithdraw} activeOpacity={0.85}>
          <Text style={styles.rowText}>탈퇴하기</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
