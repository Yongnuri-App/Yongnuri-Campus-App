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
// ✅ 신고하기 페이지 추가
import ChatRoomPage from './pages/Chat/ChatRoomPage';
import ReportPage from './pages/Report/ReportPage';

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
        <Stack.Screen name="SellItem" component={SellItemPage} />
        <Stack.Screen name="GroupBuyDetail" component={GroupBuyDetailPage} />
        <Stack.Screen name="ChatList" component={ChatListPage} />
        <Stack.Screen name="GroupBuyRecruit" component={GroupBuyRecruitPage} />
        <Stack.Screen name="LostPost" component={LostPostPage} />
        <Stack.Screen name="MarketDetail" component={MarketDetailPage} />
        <Stack.Screen name="LostDetail" component={LostDetailPage} />
        {/* ✅ 신고하기 스크린 등록 */}
        <Stack.Screen name="Report" component={ReportPage} />
        <Stack.Screen name="ChatRoom" component={ChatRoomPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
