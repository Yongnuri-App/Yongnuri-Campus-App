/**
 * 채팅 리스트 페이지 (API 연동판)
 * - /chat/rooms에서 목록을 불러와 표시
 * - 칩(전체/중고/분실/공동구매)에 따라 서버에 type 파라미터 전송
 * - 아이템 탭 시 ChatRoom으로 이동(서버 roomId 기반)
 * - 오른쪽 스와이프 → 내 목록에서만 삭제 (서버 DELETE 연동)
 * - ✅ 마지막 메시지 시각 기준 정렬/표시
 * - ✅ 새 메시지(보냄/수신) 시 자동 새로고침
 */

import { useFocusEffect } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import BottomTabBar, { TabKey } from '../../components/Bottom/BottomTabBar';
import CategoryChips, { CategoryItem } from '../../components/CategoryChips/CategoryChips';
import HeaderIcons from '../../components/Header/HeaderIcons';
import styles from './ChatListPage.styles';

import { deleteRoom as deleteRoomApi, getRooms, type ChatListItem, type ChatListType } from '@/api/chat';
import { computeUnreadCount, deleteChatRoom as deleteLocalRoom, markRoomRead, refreshAllUnread } from '@/storage/chatStore';

import type { ChatCategory, ChatRoomSummary } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';

const CHAT_CATEGORIES: CategoryItem[] = [
  { id: 'all',    label: '전체' },
  { id: 'market', label: '중고거래' },
  { id: 'lost',   label: '분실물' },
  { id: 'group',  label: '공동구매' },
];

/** 서버 type -> 앱 카테고리 매핑 */
function mapServerTypeToCategory(t: ChatListItem['type']): ChatCategory {
  if (t === 'USED_ITEM') return 'market';
  if (t === 'LOST_ITEM') return 'lost';
  return 'group'; // GROUP_BUY
}

/** 칩 -> 서버 type 파라미터 매핑 */
function mapChipToServerType(chip: string): ChatListType {
  if (chip === 'market') return 'USED_ITEM';
  if (chip === 'lost')   return 'LOST_ITEM';
  if (chip === 'group')  return 'GROUP_BUY';
  return 'ALL';
}

/** 서버 ISO/문자열을 KST 기준 타임스탬프로 */
function toKstTimestamp(isoOrText?: string): number | null {
  if (!isoOrText) return null;

  // ISO 형태면 그대로 파싱
  // 예시: "2025-11-02T02:55:48"
  const maybe = new Date(isoOrText);
  if (!Number.isNaN(maybe.getTime())) {
    return maybe.getTime();
  }

  // "19분 전", "4시간 전" 같은 상대표현은 정렬에 불리 → null 리턴해서 아래서 보정
  return null;
}

/** KST 기준 “오늘/어제/날짜(YYYY.MM.DD)” 라벨 생성 */
function formatListTimeLabel(ts: number): string {
  const now = new Date();
  const kstNow = new Date(now.getTime());
  const d = new Date(ts);

  // 오늘 00:00, 어제 00:00 경계 계산
  const startOfToday = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate(), 0, 0, 0, 0).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  if (ts >= startOfToday) {
    // 오늘 → HH:MM 24시간제
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  if (ts >= startOfYesterday) {
    return '어제';
  }
  // 그 이전 → YYYY.MM.DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** 서버 아이템 → 화면 요약모델(+ 서버 roomId 보존) */
type ListRow = ChatRoomSummary & {
  apiUpdateIso?: string;   // 서버가 내려준 ISO면 여기
  apiUpdateText?: string;  // 서버가 상대표현으로 줄 수도 있으니 보존
  serverRoomId: number;    // 서버의 실제 roomId (ChatRoom 상세 조회용)
  timeLabel: string;       // 우측 시간 라벨(오늘/어제/날짜)
  fallbackOrder: number;   // 정렬 타이브레이커(앞에 온 게 더 최신 가정)
};

function mapApiToSummary(it: ChatListItem, fallbackOrder: number): ListRow {
  const category = mapServerTypeToCategory(it.type);

  // 1) 정렬에 사용할 기준값(마지막 메시지 시각)
  //    - updateTime이 ISO면 그대로 사용
  //    - ISO가 아니면 fallback으로 “최근 먼저” 보장
  const ts = toKstTimestamp(it.updateTime);
  const lastTs = ts ?? (Date.now() + fallbackOrder); // fallbackOrder로 안정 내림차순

  // 2) 표시용 라벨
  const timeLabel = ts ? formatListTimeLabel(ts) : (it.updateTime || '');

  return {
    roomId: String(it.id),               // 로컬 키는 문자열
    category,
    nickname: it.toUserNickName,
    lastMessage: it.lastMessage || '',
    lastTs,                              // ✅ “마지막 메시지” 기준 정렬에 사용
    unreadCount: 0,
    origin: undefined,                   // (기존: 타입 깨지던 부분 방지)
    apiUpdateIso: ts ? new Date(ts).toISOString() : undefined,
    apiUpdateText: it.updateTime,
    serverRoomId: it.id,
    timeLabel,
    fallbackOrder,
  };
}

/** 리스트 한 줄 전담 컴포넌트 */
type RowProps = {
  item: ListRow;
  onPress: (room: ListRow) => void;
  onDeleted: (roomId: string) => void;
};

const ChatRowItem = memo(function ChatRowItem({ item, onPress, onDeleted }: RowProps) {
  const swipeRef = useRef<Swipeable | null>(null);
  const closeSwipe = () => swipeRef.current?.close?.();

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
            try {
              // 1) 서버에 내 쪽 삭제 요청
              await deleteRoomApi(item.serverRoomId);
            } catch (e) {
              console.log('[ChatList] deleteRoomApi error', e);
              Alert.alert('오류', '삭제 중 문제가 발생했어요. 다시 시도해주세요.');
              return;
            }
            try {
              // 2) 로컬 인덱스/미리보기 정리
              await deleteLocalRoom(item.roomId);
            } finally {
              onDeleted(item.roomId);
            }
          },
        },
      ],
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <View style={styles.swipeActionContainer}>
          <TouchableOpacity style={styles.deleteAction} activeOpacity={0.9} onPress={handleDelete}>
            <Text style={styles.deleteActionText}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity style={styles.chatRow} activeOpacity={0.8} onPress={() => onPress(item)}>
        <View style={styles.avatar}>
          <Image
            source={require('../../assets/images/yongnuri-icon.png')}
            style={styles.avatarIcon}
            resizeMode="contain"
          />
        </View>

        <View style={styles.chatTexts}>
          <View style={styles.rowTop}>
            <Text style={styles.nickname} numberOfLines={1}>
              {item.nickname || '상대방'}
            </Text>
            <Text style={styles.time}>
              {item.timeLabel}
            </Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '메시지가 없습니다'}
          </Text>
        </View>

        {item.unreadCount > 0 && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Swipeable>
  );
});

export default function ChatListPage({ navigation }: { navigation: any }) {
  const [tab, setTab] = useState<TabKey>('chat');
  const [chip, setChip] = useState<string>('all');
  const [rooms, setRooms] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(false);

  /** 목록 로더 (칩에 맞춰 서버 호출) — "마지막 메시지" 시각 기준 정렬 보장 */
  const load = useCallback(async (chipVal: string) => {
    setLoading(true);
    try {
      const serverType = mapChipToServerType(chipVal);
      const list = await getRooms(serverType);

      // 1) 서버 응답 → 요약 모델로 변환 (+fallbackOrder 부여)
      const mapped = list.map((it, idx) => mapApiToSummary(it, idx)); // idx는 fallbackOrder

      // 2) 로컬 기준 unread 병합 (병렬 계산)
      try {
        const { userEmail, userId } = await getLocalIdentity();
        const myIdentity =
          (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : '';

        if (myIdentity) {
          const unreadList = await Promise.all(
            mapped.map(r =>
              computeUnreadCount(r.roomId, myIdentity).catch(() => 0)
            )
          );
          unreadList.forEach((cnt, i) => {
            mapped[i] = { ...mapped[i], unreadCount: cnt };
          });
        }
      } catch (e) {
        console.log('[ChatList] unread calculation error', e);
      }

      // 3) 정렬: 마지막 메시지 시각 ↓ → fallbackOrder ↑ → serverRoomId ↓
      mapped.sort((a, b) => {
        const at = a.lastTs ?? 0;
        const bt = b.lastTs ?? 0;
        if (bt !== at) return bt - at;

        const af = a.fallbackOrder ?? 0;
        const bf = b.fallbackOrder ?? 0;
        if (af !== bf) return af - bf;

        return (b.serverRoomId ?? 0) - (a.serverRoomId ?? 0);
      });

      setRooms(mapped);
    } catch (e) {
      console.log('[ChatList] getRooms error', e);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 화면 포커스될 때 + 칩 변경 시 새로고침
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const { userEmail, userId } = await getLocalIdentity();
          const me = (userEmail ?? userId)
            ? (userEmail ?? userId)!.toString().toLowerCase()
            : '';
          if (me) {
            await refreshAllUnread(me); // 안읽음 계산 업데이트(기존 기능 유지)
          }
        } catch {}
        if (!alive) return;
        await load(chip);
      })();
      return () => { alive = false; };
    }, [chip, load]),
  );

  // ✅ 새 메시지 보냄/수신 시 목록 자동 새로고침
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('EVT_CHAT_LIST_NEEDS_REFRESH', async () => {
      try {
        await load(chip);
      } catch {}
    });
    return () => sub.remove();
  }, [chip, load]);

  /** 채팅방 입장: 읽음 처리(낙관적) + 서버호출 가드 + 네비게이션 파라미터 통합 */
  const enterRoom = useCallback(async (room: ListRow) => {
    // 1) 낙관적: 리스트에서 즉시 unread 제거
    setRooms(prev =>
      prev.map(r => (r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r))
    );

    // 2) 읽음 처리 (로컬/서버 시그니처 둘 다 대응)
    try {
      const { userEmail, userId } = await getLocalIdentity();
      const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString() : '';
      const ts = Date.now();

      try {
        // (A) 로컬 저장소용 시그니처: markRoomRead(roomId, me, ts)
        await markRoomRead(room.roomId, me, ts);
      } catch {
        try {
          // (B) 서버 API용 시그니처: markRoomRead(roomId)
          // @ts-expect-error 다른 시그니처 허용
          await markRoomRead(room.roomId);
        } catch {}
      }
    } catch {}

    // 3) 네비게이션: origin.params(있으면) + serverRoomId/source 힌트까지 통합 전달
    navigation.navigate('ChatRoom', {
      ...(room.origin?.params || {}),
      roomId: room.roomId,                 // 로컬 키
      serverRoomId: room.serverRoomId,     // 서버 상세 조회용
      source: room.category === 'group' ? 'groupbuy' : room.category,
    });
  }, [navigation]);

  const handleDeleted = useCallback((roomId: string) => {
    setRooms(prev => prev.filter(r => r.roomId !== roomId));
  }, []);

  // 칩(카테고리) 필터 + “마지막 메시지 시각” 기준 정렬(보강)
  const filtered = useMemo(() => {
    const list =
      chip === 'all'
        ? rooms
        : rooms.filter((r) => r.category === (chip as ChatCategory));
    // 혹시라도 setRooms 전에 순서가 어긋날 수 있으니 한번 더 보강
    return [...list].sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  }, [chip, rooms]);

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
        renderItem={({ item }) => (
          <ChatRowItem item={item} onPress={enterRoom} onDeleted={handleDeleted} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={() => load(chip)}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E1E1E' }}>
              아직 시작한 대화가 없어요
            </Text>
            <Text style={{ fontSize: 12, color: '#979797', marginTop: 4 }}>
              상세페이지에서 {'"채팅하기"'}를 눌러 시작해보세요
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* 하단 탭 */}
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
