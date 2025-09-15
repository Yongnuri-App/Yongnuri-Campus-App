// components/ProfileRow.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import styles from './ProfileRow.styles';
import { getProfileByEmail, toDisplayName } from '../../utils/session';

type Props = {
  /** 명시 텍스트 (바인딩 모드가 아닐 때만 사용) */
  name?: string;
  dept?: string;

  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;

  /** ✅ 현재 로그인 사용자 (세션의 이메일만 읽고 DB(users_all_v1)에서 조회) */
  bindCurrentUser?: boolean;

  /** ✅ 특정 이메일의 최신 닉/학부를 DB(users_all_v1)에서 조회 (상세/타유저용) */
  emailForLookup?: string | null;

  /** 닉네임 우선 표시 (기본 true) */
  preferNickname?: boolean;

  /** (선택) 조회 실패/없을 때 폴백 UI용 */
  fallbackName?: string;
  fallbackDept?: string;
};

const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_USER_EMAIL_KEY = 'auth_user_email'; // 호환 키

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
  const binding = bindCurrentUser || !!emailForLookup;
  const [stateName, setStateName] = useState<string>(binding ? '' : (name ?? ''));
  const [stateDept, setStateDept] = useState<string>(binding ? '' : (dept ?? ''));
  const isFocused = useIsFocused();

  // 바인딩 안 할 때만 외부 props 반영
  useEffect(() => {
    if (!binding && typeof name !== 'undefined') setStateName(name);
  }, [name, binding]);
  useEffect(() => {
    if (!binding && typeof dept !== 'undefined') setStateDept(dept);
  }, [dept, binding]);

  const loadByEmail = useCallback(async (email: string) => {
    try {
      const u = await getProfileByEmail(email);
      if (u) {
        const displayName = toDisplayName(u, preferNickname);
        const displayDept = u.department ?? '';
        setStateName(displayName || fallbackName || '사용자');
        setStateDept(displayDept || fallbackDept || '');
      } else {
        setStateName(fallbackName || '사용자');
        setStateDept(fallbackDept || '');
      }
    } catch (e) {
      console.log('ProfileRow loadByEmail error', e);
      setStateName(fallbackName || '사용자');
      setStateDept(fallbackDept || '');
    }
  }, [preferNickname, fallbackName, fallbackDept]);

  const loadForCurrentUser = useCallback(async () => {
    // 세션에서는 **이메일만** 읽고, 표시용은 항상 DB(users_all_v1)에서 조회
    const [[, email1], [, email2]] = await AsyncStorage.multiGet([
      AUTH_EMAIL_KEY,
      AUTH_USER_EMAIL_KEY,
    ]);
    const email = (email1 || email2 || '').toLowerCase();
    if (email) {
      await loadByEmail(email);
    } else {
      setStateName(fallbackName || '사용자');
      setStateDept(fallbackDept || '');
    }
  }, [loadByEmail, fallbackName, fallbackDept]);

  // 최초/변경/포커스시 로드
  useEffect(() => {
    if (emailForLookup) loadByEmail(emailForLookup.toLowerCase());
    else if (bindCurrentUser) loadForCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailForLookup, bindCurrentUser]);

  useEffect(() => {
    if (!isFocused) return;
    if (emailForLookup) loadByEmail(emailForLookup.toLowerCase());
    else if (bindCurrentUser) loadForCurrentUser();
  }, [isFocused, emailForLookup, bindCurrentUser, loadByEmail, loadForCurrentUser]);

  const Avatar = (
    <Image source={require('../../assets/images/profile.png')} style={styles.avatar} />
  );

  const Content = (
    <View style={styles.profileTextCol}>
      <Text style={styles.profileName} numberOfLines={1}>
        {stateName || '사용자'}
      </Text>
      {!!stateDept && (
        <Text style={styles.profileDept} numberOfLines={1}>
          {stateDept}
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
