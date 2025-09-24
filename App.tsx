// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

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
import InquiryPage from './pages/My/Inquiry/InquiryPage';
import MyPagePage from './pages/My/MyPage/MyPage';
import PersonalInfoPage from './pages/My/PersonalInfo/PersonalInfoPage';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Loading"
        screenOptions={{ headerShown: false }}
      >
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
        <Stack.Screen name="MyInquiry" component={InquiryPage} />
        <Stack.Screen name="MyWithdraw" component={WithdrawPage} />

        {/* 공지 상세 + 작성/수정 */}
        <Stack.Screen name="NoticeDetail" component={NoticeDetailPage} />
        <Stack.Screen name="AdminNoticeCreate" component={AdminNoticeCreatePage} />
        <Stack.Screen name="NoticeWrite" component={AdminNoticeCreatePage} />

        {/* 관리자 게이트 */}
        <Stack.Screen name="AdminGate" component={AdminPage} />

        {/* ✅ 관리자: 문의하기 공지 설정 */}
        <Stack.Screen name="AdminInquiryNotice" component={InquiryNoticeSettingPage} />

        {/* ✅ 관리자: 회원 정보 목록 */}
        <Stack.Screen name="AdminMemberList" component={MemberListPage} />

        {/* ✅ 관리자: 신고 관리 목록 */}
        <Stack.Screen name="AdminReportManage" component={AdminReportManagePage} />

        {/* ✅ 관리자: 전체 공지 목록 & 등록
            - iOS 스와이프 백 제스처 확실히 활성화 */}
        <Stack.Screen
          name="AdminAllNotice"
          component={AllNoticePage}
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true, // iOS: 화면 어디서나 스와이프 백
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
  );
}
