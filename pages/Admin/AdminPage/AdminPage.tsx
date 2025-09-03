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

export default function AdminPage({ navigation }: RootStackScreenProps<'AdminGate'>) {
  // 상단 아이콘 동작
  const onPressAlarm = () => navigation.navigate('Notification');
  const onPressSearch = () => navigation.navigate('Search');

  // 섹션 이동 (상세 페이지 준비되면 라우트 연결)
  const goNoticeRegister = () => {
    // navigation.navigate('AdminNoticeRegister');
  };
  const goInquiryNotice = () => {
    // navigation.navigate('AdminInquiryNotice');
  };
  const goReportManage = () => {
    // navigation.navigate('AdminReportManage');
  };
  const goMemberInfo = () => {
    // navigation.navigate('AdminMemberInfo');
  };
  const onLogout = () =>
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

  return (
    <SafeAreaView style={styles.container}>
      {/* iOS Status Bar 영역 모사 (피그마 44px) */}
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 인사 */}
        <View style={styles.greetingWrap}>
          <View style={styles.greetingTextCol}>
            <Text style={styles.greeting}>관리자님 안녕하세요!</Text>
            <Text style={styles.subDesc}>관리자 전용 페이지입니다.</Text>
          </View>
        </View>

        {/* 상단 구분선 */}
        <View style={styles.dividerTop} />

        {/* 섹션: 관리 */}
        <Text style={styles.sectionCaption}>관리</Text>

        <TouchableOpacity style={styles.row} onPress={goNoticeRegister} activeOpacity={0.85}>
          <Text style={styles.rowText}>공지사항 등록</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={goInquiryNotice} activeOpacity={0.85}>
          <Text style={styles.rowText}>문의하기 공지 설정</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={goReportManage} activeOpacity={0.85}>
          <Text style={styles.rowText}>신고 관리</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        {/* 가운데 구분선 */}
        <View style={styles.dividerMid} />

        {/* 섹션: 정보 */}
        <Text style={styles.sectionCaption}>정보</Text>

        <TouchableOpacity style={styles.row} onPress={goMemberInfo} activeOpacity={0.85}>
          <Text style={styles.rowText}>회원 정보</Text>
          <Image
            source={require('../../../assets/images/arrow.png')}
            style={styles.rowArrow}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={onLogout} activeOpacity={0.85}>
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
