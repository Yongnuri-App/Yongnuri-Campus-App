// hooks/useDisplayProfile.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const USERS_ALL_KEY = 'users_all_v1';

/** 이메일로 users_all_v1에서 최신 닉네임/이름/학부를 읽는다 */
export default function useDisplayProfile(email?: string | null, preferNickname = true) {
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const isFocused = useIsFocused();

  const load = useCallback(async () => {
    if (!email) {
      setName('');
      setDept('');
      return;
    }
    const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
    if (!raw) {
      setName('');
      setDept('');
      return;
    }
    const arr: any[] = JSON.parse(raw);
    const u = arr.find(
      (it: any) => it?.email?.toLowerCase?.() === email.toLowerCase()
    );
    const displayName = preferNickname
      ? (u?.nickname || u?.name || '')
      : (u?.name || u?.nickname || '');
    setName(displayName);
    setDept(u?.department ?? '');
  }, [email, preferNickname]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isFocused) load(); }, [isFocused, load]); // 내정보 수정 후 돌아오면 갱신

  return { name, dept };
}
