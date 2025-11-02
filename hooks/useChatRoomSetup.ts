// hooks/useChatRoomSetup.ts
import { sendMessage } from '@/api/chat';
import { resolveRoomIdForOpen } from '@/storage/chatStore';
import { mapSourceToChatType, toNum } from '@/utils/chatRoomUtils';
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

type SetupParams = {
  proposedId: string | null;
  raw: any;
  enriched: any;
  initialServerRoomId?: number;
  navigation: any;
};

export default function useChatRoomSetup({
  proposedId,
  raw,
  enriched,
  initialServerRoomId,
  navigation,
}: SetupParams) {
  const [roomId, setRoomId] = useState<string | null>(proposedId ?? null);
  const [serverRoomId, setServerRoomId] = useState<number | undefined>(initialServerRoomId);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [initialPushed, setInitialPushed] = useState(false);

  // roomId 정규화 + 메시지 이관
  useEffect(() => {
    (async () => {
      if (!proposedId) {
        setRoomId(null);
        return;
      }
      try {
        const hasBuyerIdentity =
          !!(enriched?.buyerEmail || enriched?.buyerId || enriched?.userEmail || enriched?.userId);
        const shouldBypassResolve = !!raw?.roomId && hasBuyerIdentity;

        const canonical = shouldBypassResolve
          ? proposedId
          : await resolveRoomIdForOpen(enriched, proposedId);

        const finalId = canonical ?? proposedId;

        // 메시지 이관
        if (finalId !== proposedId) {
          const K = 'chat_messages_';
          const from = await AsyncStorage.getItem(K + proposedId);
          const to = await AsyncStorage.getItem(K + finalId);
          if (from && !to) {
            await AsyncStorage.setItem(K + finalId, from);
            await AsyncStorage.removeItem(K + proposedId);
          }
        }
        setRoomId(finalId);
      } catch {
        setRoomId(proposedId);
      }
    })();
  }, [proposedId, enriched, raw]);

  // 서버 룸 ID 보장
  const ensureServerRoomId = useCallback(async (): Promise<number | undefined> => {
    if (serverRoomId || creatingRoom) return serverRoomId;

    const src = (raw?.source ?? 'market') as 'market' | 'lost' | 'groupbuy';
    const typeId = toNum(raw?.postId ?? raw?.typeId);
    const toUserId = toNum(raw?.toUserId ?? raw?.opponentId ?? raw?.sellerId ?? raw?.authorId);
    const initMsg = (raw?.initialMessage ?? '').toString();

    if (!typeId || !toUserId) return undefined;
    setCreatingRoom(true);

    try {
      const { api } = await import('@/api/client');
      const payload = {
        type: mapSourceToChatType(src),
        typeId,
        toUserId,
        message: initMsg || '안녕하세요!',
        messageType: 'text',
      };
      const res = await api.post('/chat/rooms', payload);
      const rid: number | undefined =
        typeof res?.data?.roomInfo?.roomId === 'number' ? res.data.roomInfo.roomId : undefined;

      if (rid) {
        setServerRoomId(rid);
        navigation.setParams({ serverRoomId: rid } as any);
        return rid;
      }
    } catch (e) {
      console.log('[useChatRoomSetup] ensureServerRoomId error', e);
    } finally {
      setCreatingRoom(false);
    }
    return undefined;
  }, [serverRoomId, creatingRoom, raw, navigation]);

  // 초기 메시지 자동 전송
  useEffect(() => {
    (async () => {
      if (initialPushed) return;
      const msg = (raw?.initialMessage ?? '').toString().trim();
      if (!msg) return;

      const { userId } = await getLocalIdentity();
      if (!userId) return;

      if (!serverRoomId) {
        const rid = await ensureServerRoomId();
        if (!rid) {
          setInitialPushed(true);
          return;
        }
        try {
          await sendMessage({ roomId: rid, sender: Number(userId), message: msg, type: 'text' });
        } catch (e) {
          console.log('[useChatRoomSetup] initial sendMessage error', e);
        } finally {
          setInitialPushed(true);
        }
      } else {
        setInitialPushed(true);
      }
    })();
  }, [raw?.initialMessage, serverRoomId, ensureServerRoomId, initialPushed]);

  return {
    roomId,
    serverRoomId,
    ensureServerRoomId,
  };
}