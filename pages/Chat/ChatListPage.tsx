// /pages/Chat/ChatListPage.tsx
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { CategoryItem } from '../../components/CategoryChips/CategoryChips';
import HeaderIcons from '../../components/Header/HeaderIcons';
import styles from './ChatListPage.styles';

// ✅ utils/storage.ts 헬퍼를 사용하는 chatStore
import { loadChatRooms, markRoomRead } from '@/storage/chatStore';
import type { ChatCategory, ChatRoomSummary } from '@/types/chat';

const CHAT_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: '전체' },
  { id: 'market', label: '중고거래' },
  { id: 'lost', label: '분실물' },
  { id: 'group', label: '공동구매' },
];

const timeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
};

type Props = { navigation: any };

export default function ChatListPage({ navigation }: Props) {
  const [tab, setTab] = useState<TabKey>('chat');
  const [chip, setChip] = useState<string>('all');
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const data = await loadChatRooms();
        if (mounted) setRooms(data);
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const filtered = useMemo(() => {
    if (chip === 'all') return rooms;
    return rooms.filter(r => r.category === (chip as ChatCategory));
  }, [chip, rooms]);

  const enterRoom = async (room: ChatRoomSummary) => {
    await markRoomRead(room.roomId);
    navigation.navigate('ChatRoom', {
      roomId: room.roomId,
      category: room.category,
      nickname: room.nickname,
      productTitle: room.productTitle,
      productPrice: room.productPrice,
      productImageUri: room.productImageUri,
    });
  };

  const renderItem = ({ item }: { item: ChatRoomSummary }) => (
    <TouchableOpacity
      style={styles.chatRow}
      activeOpacity={0.8}
      onPress={() => enterRoom(item)}
    >
      {/* 아바타 */}
      <View style={styles.avatar}>
        {item.avatarUri ? (
          <Image source={{ uri: item.avatarUri }} style={{ width: 44, height: 44, borderRadius: 22 }} />
        ) : (
          <Image
            source={require('../../assets/images/person.png')}
            style={styles.avatarIcon}
            resizeMode="contain"
          />
        )}
      </View>

      {/* 텍스트 영역 */}
      <View style={styles.chatTexts}>
        <View style={styles.rowTop}>
          <Text style={styles.nickname} numberOfLines={1}>
            {item.nickname}
          </Text>
          <Text style={styles.time}>
            {item.lastTs ? timeAgo(item.lastTs) : ''}
          </Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || '메시지가 없습니다'}
        </Text>
      </View>

      {/* 안읽음 표시 */}
      {item.unreadCount > 0 && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
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

      {/* 리스트 */}
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.roomId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E1E1E' }}>
              아직 시작한 대화가 없어요
            </Text>
            <Text style={{ fontSize: 12, color: '#979797', marginTop: 4 }}>
              상세페이지에서 "채팅하기"를 눌러 시작해보세요
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* 하단 탭바 */}
      <BottomTabBar
        value={tab}
        onChange={(next) => {
          setTab(next);
          if (next === 'market') navigation.navigate('Main');
          if (next === 'chat') navigation.navigate('ChatList');
        }}
      />
    </View>
  );
}
