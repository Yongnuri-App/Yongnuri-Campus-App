// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// 네비게이션 타입 정의
import { RootStackParamList } from './types/navigation';

// 페이지 컴포넌트들
import ChatListPage from './pages/Chat/ChatListPage';
import GroupBuyDetailPage from './pages/GroupBuy/GroupBuyDetailPage';
import GroupBuyRecruitPage from './pages/GroupBuy/GroupBuyRecruitPage';
import LoadingScreen from './pages/Loading/LoadingScreen';
import LoginPage from './pages/Login/LoginPage';
import LostDetailPage from './pages/LostAndFound/LostDetailPage';
import LostPostPage from './pages/LostAndFound/LostPostPage';
import MainPage from './pages/Main/MainPage';
import MarketDetailPage from './pages/Market/MarketDetailPage';
import SellItemPage from './pages/Market/SellItemPage';
import NotificationPage from './pages/Notification/NotificationPage';
import PasswordResetPage from './pages/PasswordReset/PasswordResetPage';
import SearchPage from './pages/Search/SearchPage';
import SignUpPage from './pages/SignUp/SignUpPage';
import ChatRoomPage from './pages/Chat/ChatRoomPage';
import ReportPage from './pages/Report/ReportPage';
import MyPagePage from './pages/My/MyPage/MyPage';
import PersonalInfoPage from './pages/My/PersonalInfo/PersonalInfoPage';
import FavoritesPage from './pages/My/Favorites/MyFavoritesPage';
import BlockedUsersPage from './pages/My/BlockedUsers/BlockedUsersPage';
import TradeHistoryPage from './pages/My/TradeHistory/TradeHistoryPage';
import InquiryPage from './pages/My/Inquiry/InquiryPage';
import WithdrawPage from './pages/My/Withdraw/WithdrawPage';
import AdminNoticeCreatePage from './pages/Admin/NoticeCreate/NoticeCreatePage';

// ✅ 관리자 페이지(바로 화면으로 등록)
import AdminPage from './pages/Admin/AdminPage/AdminPage';

// ✅ 공지 상세 페이지 추가
import NoticeDetailPage from './pages/Notice/NoticeDetailPage';

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
        <Stack.Screen name="Main" component={MainPage} />
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
        <Stack.Screen name="ChatList" component={ChatListPage} />
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

        {/* ✅ 공지 상세 + 작성/수정 */}
        <Stack.Screen name="NoticeDetail" component={NoticeDetailPage} />
        {/* 기존 관리자 공지 작성 화면을 NoticeWrite 별칭으로도 등록 */}
        <Stack.Screen name="AdminNoticeCreate" component={AdminNoticeCreatePage} />
        <Stack.Screen name="NoticeWrite" component={AdminNoticeCreatePage} />

        {/* ✅ 관리자 게이트 */}
        <Stack.Screen name="AdminGate" component={AdminPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
