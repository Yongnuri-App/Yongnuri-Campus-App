import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Image, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { setAuthToken } from '../../api/client';
import { authApi } from '../../api/auth';
import { ensureLocalIdentity, setAuthEmailNormalized } from '../../utils/localIdentity';
import { clearSession, setSessionFromUser, USERS_ALL_KEY, StoredUser } from '../../utils/session';
import { clearIsAdmin, setIsAdmin } from '../../utils/auth';
import { ADMIN_EMAIL } from '../../utils/admin';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export default function AppGate() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);

  const upsertUser = async (record: StoredUser) => {
    const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
    const list: StoredUser[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(u => u.email?.toLowerCase() === record.email.toLowerCase());
    if (idx >= 0) list[idx] = { ...list[idx], ...record };
    else list.unshift(record);
    await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(list));
  };

  useEffect(() => {
    (async () => {
      try {
        // 1) 저장된 토큰 복구
        const accessToken =
          (await AsyncStorage.getItem('accessToken')) ||
          (await AsyncStorage.getItem(ACCESS_TOKEN_KEY)) ||
          '';

        const refreshToken =
          (await AsyncStorage.getItem('refreshToken')) ||
          (await AsyncStorage.getItem(REFRESH_TOKEN_KEY)) ||
          '';

        if (!accessToken) {
          // 토큰 없음 → 로그인
          await clearIsAdmin();
          await clearSession();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        // 2) axios Authorization 세팅
        setAuthToken(accessToken);

        // 3) 내 정보 조회로 유효성 검증
        let me: any = null;
        try {
          const meRes = await authApi.me(); // client가 /users/me를 /mypage로 리라이트함
          me = meRes?.data ?? null;
        } catch (e: any) {
          // 401/만료 등 → 자동로그인 실패
          await clearIsAdmin();
          await clearSession();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        // 4) 세션/로컬 DB 반영
        const emailLower = String(me?.email ?? '').toLowerCase();
        const profile = {
          email: emailLower,
          name: me?.name ?? '',
          nickname: me?.nickname ?? '',
          department: me?.major ?? me?.department ?? '',
          studentId: me?.studentId ? String(me?.studentId) : '',
          isAdmin: !!me?.isAdmin || emailLower === ADMIN_EMAIL.toLowerCase(),
        };

        await upsertUser({
          email: profile.email,
          name: profile.name,
          nickname: profile.nickname,
          department: profile.department,
          studentId: profile.studentId,
          password: '',
          isAdmin: profile.isAdmin,
          createdAt: new Date().toISOString(),
        });

        await setSessionFromUser(profile);
        if (emailLower) await setAuthEmailNormalized(emailLower);
        await ensureLocalIdentity();

        if (profile.isAdmin) await setIsAdmin(true);
        else await clearIsAdmin();

        // 5) 홈으로
        navigation.reset({ index: 0, routes: [{ name: 'Main', params: { initialTab: 'market' } }] });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <View style={{ alignItems: 'center' }}>
        <Image
          source={require('../../assets/images/yongnuri-icon.png')}
          style={{ width: 96, height: 96, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>자동 로그인 확인 중…</Text>
        <ActivityIndicator />
      </View>
    </SafeAreaView>
  );
}
