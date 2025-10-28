// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RootStackParamList } from './types/navigation';

import ChatListPage from './pages/Chat/ChatListPage';
import ChatRoomPage from './pages/Chat/ChatRoomPage';
import GroupBuyDetailPage from './pages/GroupBuy/GroupBuyDetailPage';
import GroupBuyRecruitPage from './pages/GroupBuy/GroupBuyRecruitPage';
import LoadingScreen from './pages/Loading/LoadingScreen';
import LoginPage from './pages/Login/LoginPage';
import LostDetailPage from './pages/LostAndFound/LostDetailPage';
import LostPostPage from './pages/LostAndFound/LostPostPage';
import MainPage from './pages/Main/MainPage';
import MarketDetailPage from './pages/Market/MarketDetailPage';
import SellItemPage from './pages/Market/SellItemPage';
import BlockedUsersPage from './pages/My/BlockedUsers/BlockedUsersPage';
import FavoritesPage from './pages/My/Favorites/MyFavoritesPage';
import MyPagePage from './pages/My/MyPage/MyPage';
import PersonalInfoPage from './pages/My/PersonalInfo/PersonalInfoPage';
import InquiryPage from './pages/My/Inquiry/InquiryPage';
import TradeHistoryPage from './pages/My/TradeHistory/TradeHistoryPage';
import WithdrawPage from './pages/My/Withdraw/WithdrawPage';
import NotificationPage from './pages/Notification/NotificationPage';
import PasswordResetPage from './pages/PasswordReset/PasswordResetPage';
import ReportPage from './pages/Report/ReportPage';
import SearchPage from './pages/Search/SearchPage';
import SignUpPage from './pages/SignUp/SignUpPage';

// 관리자
import AdminPage from './pages/Admin/AdminPage/AdminPage';

// 공지 상세/작성
import AdminNoticeCreatePage from './pages/Notice/NoticeCreatePage';
import NoticeDetailPage from './pages/Notice/NoticeDetailPage';

// [관리자] 문의하기 공지 설정 / 회원정보 / 신고관리
import InquiryNoticeSettingPage from './pages/Admin/InquiryNoticeSetting/InquiryNoticeSettingPage';
import MemberListPage from './pages/Admin/MemberList/MemberListPage';
import AdminReportManagePage from './pages/Admin/ReportManage/AdminReportManagePage';

// ✅ [관리자] 전체 공지 목록 & 등록 (신규)
import AllNoticeCreatePage from './pages/Admin/AllNotice/AllNoticeCreatePage';
import AllNoticePage from './pages/Admin/AllNotice/AllNoticePage';

// ✅ 부팅 시 토큰 복구
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from './api/client';

// ✅ dev overlay용
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** ─────────────────────────────────────────────────────────
 * DEV 전용: 채팅 캐시 초기화
 * - chat_rooms_v1       : 채팅 리스트
 * - chat_thread_index_v1: 쓰레드-룸 매핑
 * - chat_messages_*     : 방별 메시지(선택)
 *  ───────────────────────────────────────────────────────── */
async function clearChatCache({ alsoMessages = true }: { alsoMessages?: boolean } = {}) {
  try {
    // 1) 인덱스/리스트 제거
    await AsyncStorage.removeItem('chat_thread_index_v1');
    await AsyncStorage.removeItem('chat_rooms_v1');

    // 2) (옵션) 방별 메시지 제거
    if (alsoMessages) {
      const keys = await AsyncStorage.getAllKeys();
      const msgKeys = keys.filter((k) => k.startsWith('chat_messages_'));
      if (msgKeys.length > 0) {
        await AsyncStorage.multiRemove(msgKeys);
      }
    }

    console.log('✅ 채팅 캐시 초기화 완료');
    Alert.alert('완료', '채팅 캐시를 초기화했습니다.');
  } catch (e) {
    console.error('❌ 채팅 캐시 초기화 실패', e);
    Alert.alert('오류', '채팅 캐시 초기화 중 문제가 발생했어요.');
  }
}

/** DEV 모드에서만 보이는 작은 디버그 버튼 */
function DevChatCacheButton() {
  if (!__DEV__) return null;
  return (
    <View pointerEvents="box-none" style={styles.devFloatingWrap}>
      <Pressable
        onLongPress={() => clearChatCache({ alsoMessages: true })}
        onPress={() => clearChatCache({ alsoMessages: false })}
        style={styles.devBtn}
      >
        {/* 짧게 탭: 리스트/인덱스만 초기화, 길게: 전부 초기화 */}
        <Text style={styles.devBtnText}>캐시초기화</Text>
        <Text style={styles.devBtnHint}>탭:목록만 / 길게:전체</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  // ✅ 앱 시작 시 저장된 토큰을 불러와 axios Authorization 헤더에 세팅
  useEffect(() => {
    (async () => {
      try {
        // 우선순위: 'accessToken' → 'access_token'
        const t1 = await AsyncStorage.getItem('accessToken');
        const t2 = !t1 ? await AsyncStorage.getItem('access_token') : null;
        const token = t1 || t2;
        if (token) {
          setAuthToken(token);
          console.log('[App] restored Authorization header');
        }
      } catch (e) {
        console.log('[App] token restore failed', e);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Loading" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="Signup" component={SignUpPage} />
          <Stack.Screen name="PasswordReset" component={PasswordResetPage} />

          <Stack.Screen
            name="Main"
            component={MainPage}
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen name="Search" component={SearchPage} />
          <Stack.Screen name="Notification" component={NotificationPage} />

          {/* 마켓/공동구매/분실물 */}
          <Stack.Screen name="SellItem" component={SellItemPage} />
          <Stack.Screen name="MarketDetail" component={MarketDetailPage} />
          <Stack.Screen name="GroupBuyDetail" component={GroupBuyDetailPage} />
          <Stack.Screen name="GroupBuyRecruit" component={GroupBuyRecruitPage} />
          <Stack.Screen name="LostPost" component={LostPostPage} />
          <Stack.Screen name="LostDetail" component={LostDetailPage} />

          {/* 채팅/신고 */}
          <Stack.Screen
            name="ChatList"
            component={ChatListPage}
            options={{ headerShown: false, animation: 'none' }}
          />
          <Stack.Screen name="ChatRoom" component={ChatRoomPage} />
          <Stack.Screen name="Report" component={ReportPage} />

          {/* 마이페이지 */}
          <Stack.Screen name="MyPage" component={MyPagePage} />
          <Stack.Screen name="MyPersonalInfo" component={PersonalInfoPage} />
          <Stack.Screen name="MyFavorites" component={FavoritesPage} />
          <Stack.Screen name="MyBlockedUsers" component={BlockedUsersPage} />
          <Stack.Screen name="MyTradeHistory" component={TradeHistoryPage} />
          <Stack.Screen name="MyWithdraw" component={WithdrawPage} />
          <Stack.Screen name="MyInquiry" component={InquiryPage} />

          {/* 공지 상세 + 작성/수정 */}
          <Stack.Screen name="NoticeDetail" component={NoticeDetailPage} />
          <Stack.Screen name="AdminNoticeCreate" component={AdminNoticeCreatePage} />
          <Stack.Screen name="NoticeWrite" component={AdminNoticeCreatePage} />

          {/* 관리자 게이트 */}
          <Stack.Screen name="AdminGate" component={AdminPage} />

          {/* 관리자: 문의하기 공지 설정 */}
          <Stack.Screen name="AdminInquiryNotice" component={InquiryNoticeSettingPage} />
          {/* 관리자: 회원 정보 목록 */}
          <Stack.Screen name="AdminMemberList" component={MemberListPage} />
          {/* 관리자: 신고 관리 목록 */}
          <Stack.Screen name="AdminReportManage" component={AdminReportManagePage} />

          {/* 관리자: 전체 공지 목록 & 등록 */}
          <Stack.Screen
            name="AdminAllNotice"
            component={AllNoticePage}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="AdminAllNoticeCreate"
            component={AllNoticeCreatePage}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* ✅ DEV 전용 캐시 초기화 버튼 (프로덕션 빌드에서는 렌더되지 않음) */}
      <DevChatCacheButton />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  devFloatingWrap: {
    position: 'absolute',
    right: 12,
    bottom: 18,
    zIndex: 9999,
  },
  devBtn: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    opacity: 0.82,
  },
  devBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  devBtnHint: { color: '#bbb', fontSize: 10, marginTop: 2 },
});
