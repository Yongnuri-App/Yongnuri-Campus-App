// pages/My/MyPage/MyPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
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

// 세션 키 (다른 화면과 동일 키 사용)
const AUTH_NAME_KEY = 'auth_user_name';
const AUTH_STUDENT_ID_KEY = 'auth_student_id';
const AUTH_NICKNAME_KEY = 'auth_user_nickname';

export default function MyPagePage() {
  const navigation = useNavigation<any>();

  // ✅ 스토리지에서 가져와서 렌더링할 값들
  const [nickname, setNickname] = useState<string>('');
  const [name, setName] = useState<string>(''); // 닉네임 없을 때 대비용
  const [studentId, setStudentId] = useState<string>('');

  // 공통 로더
  const loadProfile = useCallback(async () => {
    try {
      const [[, n], [, sid], [, nn]] = await AsyncStorage.multiGet([
        AUTH_NAME_KEY,
        AUTH_STUDENT_ID_KEY,
        AUTH_NICKNAME_KEY,
      ]);
      setName(n ?? '');
      setStudentId(sid ?? '');
      setNickname(nn ?? '');
    } catch (e) {
      console.log('mypage profile load error', e);
    }
  }, []);

  // 최초 1회
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 화면에 다시 포커스될 때마다 갱신 (내 정보에서 수정 후 복귀 시 반영)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // 표시용 값: 닉네임 우선, 없으면 이름, 그것도 없으면 기본 문구
  const displayName = nickname || name || '사용자';
  const displayStudentId = studentId || '-';

  // 상단 아이콘
  const onPressAlarm = () => navigation.navigate('Notification');
  const onPressSearch = () => navigation.navigate('Search');

  // 마이페이지 내 이동
  const goPersonalInfo   = () => navigation.navigate('MyPersonalInfo');
  const goFavorites      = () => navigation.navigate('MyFavorites');
  const goBlockedUsers   = () => navigation.navigate('MyBlockedUsers');
  const goTradeHistory   = () => navigation.navigate('MyTradeHistory');
  const goInquiry        = () => navigation.navigate('MyInquiry');
  const goWithdraw       = () => navigation.navigate('MyWithdraw');

  return (
    <SafeAreaView style={styles.container}>
      {/* iOS Status Bar 영역 모사 (피그마 44px) */}
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onPressSearch}
            activeOpacity={0.9}
          >
            <Image
              source={require('../../../assets/images/search.png')}
              style={styles.headerIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onPressAlarm}
            activeOpacity={0.9}
          >
            <Image
              source={require('../../../assets/images/bell.png')}
              style={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 인사(개인정보로 이동) + 오른쪽 화살표 아이콘 */}
        <TouchableOpacity
          style={styles.greetingWrap}
          activeOpacity={0.85}
          onPress={goPersonalInfo}
        >
          <View style={styles.greetingTextCol}>
            {/* ✅ 닉네임 연동 */}
            <Text style={styles.greeting}>{displayName}님 안녕하세요!</Text>
            {/* ✅ 학번 연동 */}
            <Text style={styles.subId}>{displayStudentId} 학번</Text>
          </View>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.greetingArrow}
          />
        </TouchableOpacity>

        {/* 상단 가로 구분선 (Vector 115) */}
        <View style={styles.dividerTop} />

        {/* 섹션: 나의 거래 */}
        <Text style={styles.sectionCaption}>나의 거래</Text>

        <TouchableOpacity style={styles.row} onPress={goFavorites} activeOpacity={0.85}>
          <Text style={styles.rowText}>관심 목록</Text>
        </TouchableOpacity>

        {/* 섹션: 차단한 사용자 (탭 가능하게 변경) */}
        <TouchableOpacity
          onPress={goBlockedUsers}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.sectionTitle}>차단한 사용자</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={goTradeHistory} activeOpacity={0.85}>
          <Text style={styles.rowText}>거래 내역</Text>
        </TouchableOpacity>

        {/* 가운데 가로 구분선 (Vector 116) */}
        <View style={styles.dividerMid} />

        {/* 섹션: 기타 */}
        <Text style={styles.sectionCaption}>기타</Text>

        <TouchableOpacity style={styles.row} onPress={goInquiry} activeOpacity={0.85}>
          <Text style={styles.rowText}>문의하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={goWithdraw} activeOpacity={0.85}>
          <Text style={styles.rowText}>탈퇴하기</Text>
        </TouchableOpacity>

        {/* 스크롤 하단 여백 */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
