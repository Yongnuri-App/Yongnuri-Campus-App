// pages/Chat/ChatListPage.tsx

import { useFocusEffect } from '@react-navigation/native';
import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import 'react-native-gesture-handler';
import { Swipeable } from 'react-native-gesture-handler';

import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, {
  CategoryItem,
} from '../../components/CategoryChips/CategoryChips';
import HeaderIcons from '../../components/Header/HeaderIcons';
import styles from './ChatListPage.styles';

import {
  deleteChatRoom,
  loadChatRooms,
  markRoomRead,
  refreshAllUnread,
} from '@/storage/chatStore';
import type { ChatCategory, ChatRoomSummary } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';

const CHAT_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: '전체' },
  { id: 'market', label: '중고거래' },
  { id: 'lost', label: '분실물' },
  { id: 'group', label: '공동구매' },
];

/** 마지막 메시지 시간을 "n분 전" 등으로 표시 */
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

/** 리스트 한 줄 전담 컴포넌트(여기서 훅 사용 OK) */
type ChatRowItemProps = {
  item: ChatRoomSummary;
  onPress: (room: ChatRoomSummary) => void;
  onDeleted: (roomId: string) => void;
};

const ChatRowItem = memo(function ChatRowItem({
  item,
  onPress,
  onDeleted,
}: ChatRowItemProps) {
  const swipeRef = useRef<Swipeable | null>(null);

  // 스와이프 닫기
  const closeSwipe = () => swipeRef.current?.close?.();

  // 삭제 로직 (내 목록에서만 제거)
  const handleDelete = () => {
    closeSwipe();
    Alert.alert(
      '채팅방 삭제',
      '이 채팅방을 목록에서 삭제할까요?\n(상대방 목록에는 그대로 남습니다)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteChatRoom(item.roomId); // 저장소에서 제거
            onDeleted(item.roomId); // 상위 상태 즉시 갱신
          },
        },
      ]
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <View style={styles.swipeActionContainer}>
          <TouchableOpacity
            style={styles.deleteAction}
            activeOpacity={0.9}
            onPress={handleDelete}
          >
            <Text style={styles.deleteActionText}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={styles.chatRow}
        activeOpacity={0.8}
        onPress={() => onPress(item)}
      >
        {/* 아바타 */}
        <View style={styles.avatar}>
          {item.avatarUri ? (
            <Image
              source={{ uri: item.avatarUri }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
            />
          ) : (
            <Image
              source={require('../../assets/images/yongnuri-icon.png')}
              style={styles.avatarIcon}
              resizeMode="contain"
            />
          )}
        </View>

        {/* 텍스트 영역 */}
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

        {/* 안 읽은 점: 숫자 없이 원형 배지 */}
        {item.unreadCount > 0 && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Swipeable>
  );
});

export default function ChatListPage({ navigation }: Props) {
  const [tab, setTab] = useState<TabKey>('chat');
  const [chip, setChip] = useState<string>('all');
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);

  // ✅ 화면 포커스 시: 내 아이덴티티 기준으로 전체 unread 동기화 → 최신 rooms 로딩
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const { userEmail, userId } = await getLocalIdentity();
          const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : '';
          if (me) {
            await refreshAllUnread(me); // 안읽음 계산 업데이트
          }
          const data = await loadChatRooms(); // 최신 rooms 반영
          if (mounted) setRooms(Array.isArray(data) ? data : []);
        } catch (e) {
          const data = await loadChatRooms();
          if (mounted) setRooms(Array.isArray(data) ? data : []);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  // 카테고리 필터 + 최신 메시지 시간순 정렬
  const filtered = useMemo(() => {
    const list =
      chip === 'all'
        ? rooms
        : rooms.filter((r) => r.category === (chip as ChatCategory));
    return [...list].sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  }, [chip, rooms]);

  /** ✅ 채팅방 입장: 읽음 처리 + 낙관적 UI 반영 후 네비게이션 */
  const enterRoom = useCallback(async (room: ChatRoomSummary) => {
    try {
      const { userEmail, userId } = await getLocalIdentity();
      const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString() : '';
      if (me) {
        await markRoomRead(room.roomId, me, Date.now());
        // 낙관적 업데이트: 점 즉시 제거
        setRooms(prev => prev.map(r => r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r));
      }
    } catch (e) {
      // 식별 불가 시 skip
    }

    // 기존 저장된 네비게이션 파라미터가 있으면 그대로 사용
    if (room.origin?.params) {
      navigation.navigate('ChatRoom', {
        ...room.origin.params,
        roomId: room.roomId,
      });
      return;
    }

    // 폴백: 최대한 힌트 전달(상대 닉/상품/위치 등)
    navigation.navigate('ChatRoom', {
      roomId: room.roomId,
      source: room.category === 'group' ? 'groupbuy' : room.category,
      category: room.category,
      nickname: room.nickname,
      productTitle: room.productTitle,
      productPrice: room.productPrice,
      productImageUri: room.productImageUri,
      sellerNickname: (room as any).sellerNickname,
      buyerNickname: (room as any).buyerNickname,
      sellerEmail: room.sellerEmail,
      sellerId: room.sellerId,
      place: room.place,
      purpose: room.purpose,
      recruitLabel: room.recruitLabel,
    });
  }, [navigation]);

  /** 삭제 후 상위 리스트 즉시 갱신(낙관적 업데이트) */
  const handleDeleted = useCallback((roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
  }, []);

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>채팅</Text>
        <HeaderIcons />
      </View>

      {/* 카테고리 칩스 */}
      <CategoryChips
        value={chip}
        onChange={setChip}
        items={CHAT_CATEGORIES}
        containerStyle={{ marginTop: 4, marginBottom: 8 }}
      />

      {/* 채팅방 리스트 */}
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.roomId}
        renderItem={({ item }) => (
          <ChatRowItem
            item={item}
            onPress={enterRoom}
            onDeleted={handleDeleted}
          />
        )}
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
