import React, { useState } from 'react';
import { Text, View } from 'react-native';
import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { DEFAULT_CATEGORIES } from '../../components/CategoryChips/CategoryChips';
import FloatingWriteButton from '../../components/FloatingButton/FloatingWriteButton';
import MainHeader from '../../components/Header/MainHeader';
import styles from './MainPage.styles';

export default function MainPage({ navigation }: any) {
  // 카테고리 기본값: '전체'
  const [category, setCategory] = useState<string>('all');
  // 기본 탭: "중고거래(market)"
  const [tab, setTab] = useState<TabKey>('market');

  // 탭 변경 시 호출되는 핸들러
  const handleTabChange = (next: TabKey) => {
    setTab(next);

    if (next === 'chat') {
      // 이미 채팅 페이지에 있다면 중복 push 방지용으로 replace 권장
      navigation.replace('ChatList');
      return;
    }
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 (컴포넌트 분리) */}
      <MainHeader />

      {/* 카테고리 칩 컴포넌트 */}
      <CategoryChips
        value={category}
        onChange={setCategory}
        items={DEFAULT_CATEGORIES}
        containerStyle={{ marginTop: 12, marginBottom: 8 }}
      />

      {/* 메인 컨텐츠 예시 */}
      <View style={styles.content}>
        {/* TODO: 선택된 탭/카테고리 상태를 활용하는 자리 (실제 리스트/API 필터 연결 예정) */}
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
      />
    </View>
  );
}