// ChatListPage.tsx
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

import { getRoomDetail, getRooms, type ChatListItem, type ChatListType } from '@/api/chat';
import { getGroupBuyDetail } from '@/api/groupBuy';
import { getLostFoundDetail } from '@/api/lost';
import {
  computeUnreadCount,
  deleteChatRoom as deleteLocalRoom,
  markRoomRead,
  refreshAllUnread,
} from '@/storage/chatStore';

import type { ChatCategory, ChatMessage, ChatRoomSummary } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';

import { getBlockedAt } from '@/utils/blocked'; // ✅ 차단 시각 조회
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------- 계정별 숨김 컷오프 맵 ----------------
type HiddenMap = Record<string, number>; // serverRoomId -> cutoff(ms)
function hiddenKeyFor(identity: string) {
  return `${identity || 'anon'}::chat_hidden_server_rooms_v1`;
}
async function loadHiddenMap(identity: string): Promise<HiddenMap> {
  try {
    const raw = await AsyncStorage.getItem(hiddenKeyFor(identity));
    return raw ? (JSON.parse(raw) as HiddenMap) : {};
  } catch {
    return {};
  }
}
async function saveHiddenMap(identity: string, map: HiddenMap) {
  try {
    await AsyncStorage.setItem(hiddenKeyFor(identity), JSON.stringify(map));
  } catch {}
}
async function recordHiddenCutoff(identity: string, serverRoomId: number, atMs: number = Date.now()) {
  const map = await loadHiddenMap(identity);
  map[String(serverRoomId)] = atMs;
  await saveHiddenMap(identity, map);
}
function getHiddenCutoffSync(hiddenMap: HiddenMap, serverRoomId: number): number {
  return hiddenMap[String(serverRoomId)] ?? 0;
}

const CHAT_CATEGORIES: CategoryItem[] = [
  { id: 'all',    label: '전체' },
  { id: 'market', label: '중고거래' },
  { id: 'lost',   label: '분실물' },
  { id: 'group',  label: '공동구매' },
];

function mapServerTypeToCategory(t: ChatListItem['type']): ChatCategory {
  if (t === 'USED_ITEM') return 'market';
  if (t === 'LOST_ITEM') return 'lost';
  return 'group';
}
function mapChipToServerType(chip: string): ChatListType {
  if (chip === 'market') return 'USED_ITEM';
  if (chip === 'lost')   return 'LOST_ITEM';
  if (chip === 'group')  return 'GROUP_BUY';
  return 'ALL';
}

/** 서버 ISO -> 타임스탬프 */
function toKstTimestamp(isoOrText?: string): number | null {
  if (!isoOrText) return null;
  const d = new Date(isoOrText);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}
function formatListTimeLabel(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0).getTime();
  const startOfYesterday = startOfToday - 24*60*60*1000;

  if (ts >= startOfToday) {
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  if (ts >= startOfYesterday) return '어제';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}.${m}.${day}`;
}

/** ===== 로컬 메시지 읽기(프리뷰 보정용) ===== */
const STORAGE_PREFIX = 'chat_messages_';
async function messageKey(roomId: string) {
  const { userEmail, userId } = await getLocalIdentity();
  const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : 'anon';
  return `${me}::${STORAGE_PREFIX}${roomId}`;
}
async function readLocalMessages(roomId: string): Promise<ChatMessage[]> {
  try {
    const key = await messageKey(roomId);
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}
function msgTs(m: any): number {
  const iso = (m?.time || m?.createdAt) as string | undefined;
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}
function previewFromMessage(m: ChatMessage): string {
  if (m.type === 'text') return (m as any).text || '';
  if (m.type === 'image') return '사진';
  if (m.type === 'system') return (m as any).text || '';
  return '';
}

/** 서버 아이템 → 화면 요약모델 */
type ListRow = ChatRoomSummary & {
  apiUpdateIso?: string;
  apiUpdateText?: string;
  serverRoomId: number;
  timeLabel: string;
  fallbackOrder: number;
};
function mapApiToSummary(it: ChatListItem, fallbackOrder: number): ListRow {
  const category = mapServerTypeToCategory(it.type);
  const ts = toKstTimestamp(it.updateTime);
  const lastTs = ts ?? (Date.now() - fallbackOrder);
  const timeLabel = ts ? formatListTimeLabel(ts) : (it.updateTime || '');

  return {
    roomId: String(it.id), // 로컬 키(문자열화)
    category,
    nickname: it.toUserNickName,
    lastMessage: it.lastMessage || '',
    lastTs, // ⬅ 정렬키: 기존 로직 유지
    unreadCount: 0,
    origin: undefined,
    apiUpdateIso: ts ? new Date(ts).toISOString() : undefined,
    apiUpdateText: it.updateTime,
    serverRoomId: it.id,
    timeLabel,
    fallbackOrder,
  };
}

/** 리스트 한 줄 */
type RowProps = {
  item: ListRow;
  onPress: (room: ListRow) => void;
  onDeleted: (roomId: string, serverRoomId: number) => void;
};
const ChatRowItem = memo(function ChatRowItem({ item, onPress, onDeleted }: RowProps) {
  const swipeRef = useRef<Swipeable | null>(null);
  const closeSwipe = () => swipeRef.current?.close?.();

  const handleDelete = () => {
    closeSwipe();
    Alert.alert(
      '채팅방 숨기기',
      '내 목록에서만 숨겨집니다. 상대방 목록/대화에는 영향이 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '숨기기',
          style: 'destructive',
          onPress: async () => {
            try { onDeleted(item.roomId, item.serverRoomId); }
            catch { Alert.alert('오류', '삭제 중 문제가 발생했어요. 다시 시도해주세요.'); }
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
            <Text style={styles.time}>{item.timeLabel}</Text>
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

  const hiddenRef = useRef<HiddenMap>({});
  const identityRef = useRef<string>('');
  const userInitiatedRef = useRef<boolean>(false);

  /** ✅ 차단 이후 상대 메시지 숨김: 프리뷰만 보정(정렬 lastTs는 그대로) */
  const applyBlockAwarePreview = useCallback(async (rows: ListRow[]): Promise<ListRow[]> => {
    const patched = await Promise.all(rows.map(async (r) => {
      try {
        // 1) 상세에서 상대 ID 확보
        const detail = await getRoomDetail(r.serverRoomId);
        const oppId = detail?.roomInfo?.opponentId;
        if (oppId == null) return r;

        // 2) 차단 시각
        const blockedSince = await getBlockedAt(String(oppId));
        if (!blockedSince) return r;

        // 3) 로컬에서 차단 이후 '상대' 메시지 제외
        const local = await readLocalMessages(r.roomId);
        if (!Array.isArray(local) || local.length === 0) return r;

        const oppIdStr = String(oppId);
        const visible = local.filter((m) => {
          const ts = msgTs(m);
          const sid = (m as any)?.senderId != null ? String((m as any).senderId) : null;
          const isOpponent = !!sid && sid === oppIdStr;
          if (isOpponent && ts >= blockedSince) return false;
          return true;
        });

        if (visible.length === 0) {
          // 프리뷰만 비움(정렬키는 그대로)
          return { ...r, lastMessage: '' };
        }

        const last = visible.reduce((a, b) => (msgTs(a) > msgTs(b) ? a : b));
        const displayTs = msgTs(last) || r.lastTs;

        return {
          ...r,
          lastMessage: previewFromMessage(last),
          timeLabel: formatListTimeLabel(displayTs), // 표시 라벨만 보정
          // r.lastTs(정렬)는 그대로 유지
        };
      } catch {
        return r;
      }
    }));
    return patched;
  }, []);

  const load = useCallback(async (chipVal: string) => {
    setLoading(true);
    try {
      // 계정 식별자
      const { userEmail, userId } = await getLocalIdentity();
      const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : 'anon';
      identityRef.current = me;

      // 계정별 숨김맵
      hiddenRef.current = await loadHiddenMap(me);

      // 서버 목록
      const serverType = mapChipToServerType(chipVal);
      const list = await getRooms(serverType);

      // 변환
      let mapped = list.map((it, idx) => mapApiToSummary(it, idx));

      // 숨김 필터: 내가 숨긴 뒤에 온 업데이트만 통과
      mapped = mapped.filter((r) => {
        const cut = getHiddenCutoffSync(hiddenRef.current, r.serverRoomId);
        if (!cut) return true;
        const ts = r.lastTs ?? 0;
        return ts > cut;
      });

      // ✅ 차단 프리뷰 보정(정렬키 불변)
      mapped = await applyBlockAwarePreview(mapped);

      // unread 병합
      try {
        if (me) {
          const unreadList = await Promise.all(
            mapped.map(r => computeUnreadCount(r.roomId, me).catch(() => 0))
          );
          unreadList.forEach((cnt, i) => {
            mapped[i] = { ...mapped[i], unreadCount: cnt };
          });
        }
      } catch (e) {
        console.log('[ChatList] unread calculation error', e);
      }

      // 정렬: 기존 로직 그대로(lastTs desc)
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
  }, [applyBlockAwarePreview]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const { userEmail, userId } = await getLocalIdentity();
          const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : '';
          if (me) await refreshAllUnread(me);
        } catch {}
        if (!alive) return;
        await load(chip);
      })();
      return () => { alive = false; };
    }, [chip, load]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('EVT_CHAT_LIST_NEEDS_REFRESH', async () => {
      try { await load(chip); } catch {}
    });
    return () => sub.remove();
  }, [chip, load]);

  // ✅ enterRoom 함수 추가
  const enterRoom = useCallback(async (room: ListRow) => {
    // 읽음 처리
    setRooms(prev => prev.map(r => (r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r)));
    
    try {
      const { userEmail, userId } = await getLocalIdentity();
      const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString() : '';
      const ts = Date.now();
      try { 
        await markRoomRead(room.roomId, me, ts); 
      } catch {}
    } catch {}

    // ✅ 분실물인 경우 서버에서 상세 정보 가져오기
    let extraParams: any = {};
    if (room.category === 'lost') {
      try {
        const detail = await getRoomDetail(room.serverRoomId);
        const postId = detail?.roomInfo?.chatTypeId;
        
        if (postId) {
          // ✅ 전체 분실물 상세 API 호출
          const lostDetail = await getLostFoundDetail(String(postId));
          
          // ✅ purpose는 API의 purpose 필드 직접 사용 (소문자로 변환)
          const purposeLower = lostDetail.purpose.toLowerCase() as 'lost' | 'found';
          
          // ✅ 썸네일은 images 배열의 첫 번째 이미지
          const thumbnail = Array.isArray(lostDetail.images) && lostDetail.images.length > 0
            ? lostDetail.images[0].imageUrl
            : '';
          
          extraParams = {
            purpose: purposeLower,              // 'lost' 또는 'found'
            place: lostDetail.location || '',   // 장소
            postId: String(postId),
            postTitle: lostDetail.title || '',
            postImageUri: thumbnail,
          };
          console.log('[ChatList] ✅ 분실물 정보 로드:', extraParams);
        }
      } catch (e) {
        console.log('[ChatList] 분실물 정보 로드 실패:', e);
      }
    }

    // ✅ 공동구매 로직 (추가)
  if (room.category === 'group') {
    try {
      const detail = await getRoomDetail(room.serverRoomId);
      const postId = detail?.roomInfo?.chatTypeId;
      
      if (postId) {
        const groupDetail = await getGroupBuyDetail(String(postId)); // API 함수명 확인 필요
        
        const current =
          (typeof groupDetail.currentCount === 'number'
            ? groupDetail.currentCount
            : typeof groupDetail.current_count === 'number'
            ? groupDetail.current_count
            : 0);

        const max = typeof groupDetail.limit === 'number' ? groupDetail.limit : 0;

        extraParams = {
          postId: String(postId),
          postTitle: groupDetail.title || '',
          postImageUri: groupDetail.images?.[0]?.imageUrl || '',
          recruitLabel: `현재 모집 인원 ${current}명 (${max}명)`,
        };
        console.log('[ChatList] ✅ 공동구매 정보 로드:', extraParams);
      }
    } catch (e) {
      console.log('[ChatList] 공동구매 정보 로드 실패:', e);
    }
  }

    // 채팅방으로 이동
    navigation.navigate('ChatRoom', {
      ...(room.origin?.params || {}),
      ...extraParams,
      roomId: room.roomId,
      serverRoomId: room.serverRoomId,
      source: room.category === 'group' ? 'groupbuy' : room.category,
    });
  }, [navigation]);

  const handleDeleted = useCallback(async (roomId: string, serverRoomId: number) => {
    // 1) 계정별 컷오프 기록 (내 쪽만 적용)
    try {
      const { userEmail, userId } = await getLocalIdentity();
      const me = (userEmail ?? userId) ? (userEmail ?? userId)!.toString().toLowerCase() : 'anon';
      await recordHiddenCutoff(me, serverRoomId);
    } catch {}

    // 2) 로컬 정리
    try {
      await deleteLocalRoom(roomId);
    } finally {
      setRooms(prev => prev.filter(r => r.roomId !== roomId));
    }
  }, []);

  const filtered = useMemo(() => {
    const list =
      chip === 'all'
        ? rooms
        : rooms.filter((r) => r.category === (chip as ChatCategory));
    return [...list].sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0)); // 기존 정렬 그대로
  }, [chip, rooms]);

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
