import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import styles from './ProfileRow.styles';
import { getProfileByEmail, toDisplayName } from '../../utils/session';

type Props = {
  /** 윗줄(닉네임/이름) — 있으면 무조건 우선 */
  name?: string;
  /** 아랫줄(✅ 학과/전공) — 있으면 무조건 우선 */
  dept?: string;

  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;

  /** 현재 로그인 사용자 — 조회 보조(부모가 값 주면 사용 안 함) */
  bindCurrentUser?: boolean;

  /** 특정 이메일 조회 — 보조(부모가 값 주면 사용 안 함) */
  emailForLookup?: string | null;

  /** 닉네임 우선 표시 (조회 시에만 적용) */
  preferNickname?: boolean;

  /** 폴백 */
  fallbackName?: string;
  fallbackDept?: string;
};

const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

function ProfileRow({
  name,
  dept,
  right,
  onPress,
  style,
  bindCurrentUser = false,
  emailForLookup = null,
  preferNickname = true,
  fallbackName,
  fallbackDept,
}: Props) {
  const isFocused = useIsFocused();

  // 조회값(부모가 안 줄 때만 사용)
  const [loadedName, setLoadedName] = useState<string>('');
  const [loadedDept, setLoadedDept] = useState<string>('');

  const loadByEmail = useCallback(
    async (email: string) => {
      try {
        const u = await getProfileByEmail(email);
        if (u) {
          const displayName = toDisplayName(u, preferNickname);
          const displayDept: string =
            (u as any)?.major ??
            (u as any)?.department ??
            (u as any)?.dept ??
            '';
          setLoadedName(displayName || fallbackName || '사용자');
          setLoadedDept(displayDept || fallbackDept || '');
        } else {
          setLoadedName(fallbackName || '사용자');
          setLoadedDept(fallbackDept || '');
        }
      } catch (e) {
        console.log('ProfileRow loadByEmail error', e);
        setLoadedName(fallbackName || '사용자');
        setLoadedDept(fallbackDept || '');
      }
    },
    [preferNickname, fallbackName, fallbackDept]
  );

  const loadForCurrentUser = useCallback(async () => {
    const [[, email1], [, email2]] = await AsyncStorage.multiGet([
      AUTH_EMAIL_KEY,
      AUTH_USER_EMAIL_KEY,
    ]);
    const email = (email1 || email2 || '').toLowerCase();
    if (email) await loadByEmail(email);
    else {
      setLoadedName(fallbackName || '사용자');
      setLoadedDept(fallbackDept || '');
    }
  }, [loadByEmail, fallbackName, fallbackDept]);

  // ⚠️ 부모가 name/dept를 주면 “조회는 보조일 뿐” → 절대 덮어쓰지 않음
  useEffect(() => {
    if (name !== undefined || dept !== undefined) return;
    if (emailForLookup) loadByEmail(emailForLookup.toLowerCase());
    else if (bindCurrentUser) loadForCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailForLookup, bindCurrentUser]);

  useEffect(() => {
    if (!isFocused) return;
    if (name !== undefined || dept !== undefined) return;
    if (emailForLookup) loadByEmail(emailForLookup.toLowerCase());
    else if (bindCurrentUser) loadForCurrentUser();
  }, [isFocused, emailForLookup, bindCurrentUser, loadByEmail, loadForCurrentUser, name, dept]);

  const finalName =
    (typeof name === 'string' && name.trim() !== '') ? name : (loadedName || fallbackName || '사용자');

  const finalDept =
    (typeof dept === 'string' && dept.trim() !== '') ? dept : (loadedDept || fallbackDept || '');

  const Avatar = (
    <Image source={require('../../assets/images/profile.png')} style={styles.avatar} />
  );

  const Content = (
    <View style={styles.profileTextCol}>
      <Text style={styles.profileName} numberOfLines={1}>
        {finalName}
      </Text>
      {!!finalDept && (
        <Text style={styles.profileDept} numberOfLines={1}>
          {finalDept}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.profileRow, style]}>
      {onPress ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={onPress}
        >
          {Avatar}
          {Content}
        </TouchableOpacity>
      ) : (
        <>
          {Avatar}
          {Content}
        </>
      )}
      {!!right && <View style={{ marginLeft: 8 }}>{right}</View>}
    </View>
  );
}

export default memo(ProfileRow);
