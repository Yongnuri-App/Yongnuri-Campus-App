// pages/Admin/AdminPage/AdminPage.tsx
import React from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import styles from './AdminPage.styles';
import type { RootStackScreenProps } from '../../../types/navigation';
import { clearIsAdmin } from '../../../utils/auth';

export default function AdminPage({
  navigation,
}: RootStackScreenProps<'AdminGate'>) {
  // 상단 아이콘
  const onPressAlarm = () => navigation.navigate('Notification');
  const onPressSearch = () => navigation.navigate('Search');

  // 섹션 이동
  const goAllNotice = () => navigation.navigate('AdminAllNotice'); // ✅ 추가
  const goInquiryNotice = () => navigation.navigate('AdminInquiryNotice');
  const goReportManage = () => navigation.navigate('AdminReportManage');
  const goMemberInfo = () => navigation.navigate('AdminMemberList');

  const onLogout = async () => {
    await clearIsAdmin();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>관리자페이지</Text>
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

      {/* 콘텐츠 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 인사말 */}
        <View style={styles.greetingWrap}>
          <View style={styles.greetingTextCol}>
            <Text style={styles.greeting}>관리자님 안녕하세요!</Text>
            <Text style={styles.subDesc}>관리자 전용 페이지입니다.</Text>
          </View>
        </View>

        <View style={styles.dividerTop} />
        <Text style={styles.sectionCaption}>관리</Text>

        {/* ✅ 전체 공지사항 → AllNoticePage 이동 */}
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          onPress={goAllNotice}
        >
          <Text style={styles.rowText}>전체 공지사항</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={goInquiryNotice}
          activeOpacity={0.85}
        >
          <Text style={styles.rowText}>문의하기 공지 설정</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={goReportManage}
          activeOpacity={0.85}
        >
          <Text style={styles.rowText}>신고 관리</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <View style={styles.dividerMid} />
        <Text style={styles.sectionCaption}>정보</Text>

        <TouchableOpacity
          style={styles.row}
          onPress={goMemberInfo}
          activeOpacity={0.85}
        >
          <Text style={styles.rowText}>회원 정보</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={onLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.rowText}>로그아웃</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
