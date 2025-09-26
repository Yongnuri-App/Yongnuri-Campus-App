// /pages/Chat/ChatListPage.tsx
// (변경점)
// - enterRoom 폴백 경로에서 sellerNickname / buyerNickname 힌트 전달
//   → ChatRoom이 상대 닉네임 계산 시 소스 확장으로 누락 방지

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { CategoryItem } from '../../components/CategoryChips/CategoryChips';
import HeaderIcons from '../../components/Header/HeaderIcons';
import styles from './ChatListPage.styles';

import { loadChatRooms, markRoomRead } from '@/storage/chatStore';
import type { ChatCategory, ChatRoomSummary } from '@/types/chat';

const CHAT_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: '전체' },
  { id: 'market', label: '중고거래' },
  { id: 'lost', label: '분실물' },
  { id: 'group', label: '공동구매' },
];

const timeAgo = (ts: number) => {
  const now = Date.now();
  const base = Number.isFinite(ts) ? ts : now;
  const diff = now - base;
  if (diff < 0) return '방금 전';
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
        if (mounted) setRooms(Array.isArray(data) ? data : []);
      })();
      return () => { mounted = false; };
    }, [])
  );

  const filtered = useMemo(() => {
    const list = chip === 'all' ? rooms : rooms.filter(r => r.category === (chip as ChatCategory));
    return [...list].sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  }, [chip, rooms]);

  const enterRoom = async (room: ChatRoomSummary) => {
    await markRoomRead(room.roomId);

    if (room.origin?.params) {
      navigation.navigate('ChatRoom', {
        ...room.origin.params,
        roomId: room.roomId,
      });
      return;
    }

    // ✅ 폴백: 닉네임/아이디 힌트 최대한 전파
    navigation.navigate('ChatRoom', {
      roomId: room.roomId,
      source: room.category === 'group' ? 'groupbuy' : room.category,
      category: room.category,
      nickname: room.nickname,
      productTitle: room.productTitle,
      productPrice: room.productPrice,
      productImageUri: room.productImageUri,

      // ⬇️ 있으면 전달 (타입에 옵션 필드로 두면 안전)
      sellerNickname: (room as any).sellerNickname,
      buyerNickname: (room as any).buyerNickname,

      sellerEmail: room.sellerEmail,
      sellerId: room.sellerId,
      place: room.place,
      purpose: room.purpose,
      recruitLabel: room.recruitLabel,
    });
  };

  const renderItem = ({ item }: { item: ChatRoomSummary }) => (
    <TouchableOpacity
      style={styles.chatRow}
      activeOpacity={0.8}
      onPress={() => enterRoom(item)}
    >
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

      <View style={styles.chatTexts}>
        <View style={styles.rowTop}>
          <Text style={styles.nickname} numberOfLines={1}>
            {item.nickname || '상대방'}
          </Text>
          <Text style={styles.time}>
            {item.lastTs ? timeAgo(item.lastTs) : ''}
          </Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || '메시지가 없습니다'}
        </Text>
      </View>

      {item.unreadCount > 0 && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>채팅</Text>
        <HeaderIcons />
      </View>

      <CategoryChips
        value={chip}
        onChange={setChip}
        items={CHAT_CATEGORIES}
        containerStyle={{ marginTop: 4, marginBottom: 8 }}
      />

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

      <BottomTabBar
        value={tab}
        onChange={(next) => {
          setTab(next);
          if (next === 'chat') {
            navigation.replace('ChatList', { noAnim: true });
            return;
          }
          navigation.replace('Main', { initialTab: next });
        }}
      />
    </View>
  );
}
