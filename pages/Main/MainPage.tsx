import React, { useState } from 'react';
import { Text, View } from 'react-native';
import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import FloatingWriteButton from '../../components/FloatingButton/FloatingWriteButton';
import MainHeader from '../../components/Header/MainHeader';
import styles from './MainPage.styles';

export default function MainPage() {
  // 기본 탭: "중고거래(market)"
  const [tab, setTab] = useState<TabKey>('market');

  // 탭 변경 시 호출되는 핸들러
  const handleTabChange = (next: TabKey) => {
    setTab(next);

    // TODO: 필요하면 여기서 라우팅 or 메인 컨텐츠 스위칭 처리
    // ex) if (next === 'chat') navigation.navigate('ChatList');
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 (컴포넌트 분리) */}
      <MainHeader />

      {/* 메인 컨텐츠 예시 */}
      <View style={styles.content}>
        <Text style={styles.exampleText}>
          {tab === 'market' && '👜 중고거래 컨텐츠'}
          {tab === 'lost' && '📦 분실물 컨텐츠'}
          {tab === 'chat' && '💬 채팅 컨텐츠'}
          {tab === 'group' && '👥 공동구매 컨텐츠'}
          {tab === 'notice' && '📢 공지사항 컨텐츠'}
        </Text>
      </View>

      {/* 하단 탭바 */}
      <BottomTabBar value={tab} onChange={handleTabChange} />

      {/* 글쓰기 버튼 (플로팅 버튼) */}
      <FloatingWriteButton
        activeTab={tab}
        // bottomOffset={100} // 필요시 수동 조정
        // onPressOverride={() => navigation.navigate('어떤페이지')}
      />
    </View>
  );
}