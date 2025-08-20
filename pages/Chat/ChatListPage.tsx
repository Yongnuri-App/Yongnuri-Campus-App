// pages/Chat/ChatListPage.tsx
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { CategoryItem } from '../../components/CategoryChips/CategoryChips';
import HeaderIcons from '../../components/Header/HeaderIcons';
import styles from './ChatListPage.styles';

type ChatItem = {
  id: string;
  category: 'market' | 'lost' | 'group';
  nickname: string;
  lastMessage: string;
  time: string; // "1분 전" 같은 짧은 문자열
  unread?: boolean;
};

const CHAT_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: '전체' },
  { id: 'market', label: '중고거래' },
  { id: 'lost', label: '분실물' },
  { id: 'group', label: '공동구매' },
];

// 임시 목업 데이터
const MOCK_CHATS: ChatItem[] = [
  { id: 'c1', category: 'market', nickname: '닉네임', lastMessage: '안녕하세요? 안녕하세요? 안녕하세요? 안녕하세요?으갸갸갹', time: '1분 전', unread: true },
  { id: 'c2', category: 'lost',   nickname: '닉네임', lastMessage: '안녕하시소? 안녕하시소? 안녕하시소? 안녕하시소?', time: '1분 전' },
  { id: 'c3', category: 'group',  nickname: '닉네임', lastMessage: '안녕하시소? 안녕하시소? 안녕하시소? 안녕하시소?오메오메', time: '1분 전' },
  { id: 'c4', category: 'market', nickname: '닉네임', lastMessage: '안녕하세요? 안녕하세요? 안녕하세요? 안녕하세요?흐미', time: '1분 전' },
];

export default function ChatListPage({ navigation }: any) {
  const [tab, setTab] = useState<TabKey>('chat');
  const [chip, setChip] = useState<string>('all');

  const filtered = useMemo(() => {
    if (chip === 'all') return MOCK_CHATS;
    return MOCK_CHATS.filter(c => c.category === chip);
  }, [chip]);

  const renderItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatRow}
      activeOpacity={0.8}
      onPress={() => console.log('채팅방 진입 예정:', item.id)}
    >
      {/* 아바타(플레이스홀더) */}
      <View style={styles.avatar}>
        <Image
          source={require('../../assets/images/person.png')}
          style={styles.avatarIcon}
          resizeMode="contain"
        />
      </View>

      {/* 텍스트 블록 */}
      <View style={styles.chatTexts}>
        <View style={styles.rowTop}>
          <Text style={styles.nickname} numberOfLines={1}>{item.nickname}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      {/* 안읽음 점 표시 */}
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 헤더: 좌 타이틀, 우 아이콘 */}
      <View style={styles.header}>
        <Text style={styles.title}>채팅</Text>
        <HeaderIcons />
      </View>

      {/* 카테고리 칩 */}
      <CategoryChips
        value={chip}
        onChange={setChip}
        items={CHAT_CATEGORIES}
        containerStyle={{ marginTop: 4, marginBottom: 8 }}
      />

      {/* 채팅 리스트 (임시 목업) */}
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 하단 탭바 */}
      <BottomTabBar
        value={tab}
        onChange={(next) => {
          setTab(next);
          if (next === 'market') navigation.navigate('Main');
          if (next === 'chat') navigation.navigate('ChatList');
          // 다른 탭 라우팅 필요 시 여기에 추가
        }}
      />
    </View>
  );
}
