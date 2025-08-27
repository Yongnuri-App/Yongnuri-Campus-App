import React from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styles from './MyPage.styles';

export default function MyPagePage() {
  const navigation = useNavigation<any>();

  // TODO: 실제 사용자 데이터로 치환
  const userName = '000';
  const studentId = '202178010';

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
            {/* 검색 아이콘 (search.png) */}
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
            {/* 벨 아이콘 (bell.png) */}
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
            <Text style={styles.greeting}>{userName}님 안녕하세요!</Text>
            <Text style={styles.subId}>{studentId} 학번</Text>
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
        <TouchableOpacity onPress={goBlockedUsers} activeOpacity={0.85} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
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
