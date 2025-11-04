// hooks/useLostClose.ts
import { useCallback, useRef, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';

import type { LostSimpleStatus } from '@/components/Chat/LostCloseButton/LostCloseButton';
import { updateRoomOnSend } from '@/storage/chatStore';
import type { ChatMessage } from '@/types/chat';
import { formatKoreanTime } from '@/utils/chatTime';

import { updateLostItemStatus } from '@/api/lost'; // ✅ 이 줄 추가
import {
  upsertRecoveredLostItemsForRecipients
} from '@/storage/tradeHistoryStore';
import { getLocalIdentity } from '@/utils/localIdentity';

export const EVT_TRADE_HISTORY_UPDATED = 'tradeHistory:updated';

type Options = {
  roomId: string | null;
  initial: LostSimpleStatus;
  pushMessage: (msg: ChatMessage) => void;

  postId?: string;
  postTitle?: string;
  postImageUri?: string;
  place?: string;

  /** ✅ 회수 내역을 반영할 수신자 이메일들(게시자 + 상대방 등) */
  recipientEmails?: string[];

  /** ⬇️ 구버전 호환: 단일 이메일만 넘어오면 배열로 승격 */
  ownerEmail?: string | null;

  rollbackOnError?: boolean;
};

const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

export default function useLostClose({
  roomId,
  initial,
  pushMessage,
  postId,
  postTitle,
  postImageUri,
  place,
  recipientEmails,
  ownerEmail,
  rollbackOnError = false,
}: Options) {
  const [status, setStatus] = useState<LostSimpleStatus>(initial);
  const lockingRef = useRef(false);
  const lastSuccessPostIdRef = useRef<string | null>(null);

  /** 필요한 경우 세션 이메일로 보완 + 유니크 정리 */
  const resolveRecipients = useCallback(async (): Promise<string[]> => {
    // 1) 우선 순위: 명시된 recipientEmails
    let list = Array.isArray(recipientEmails) ? recipientEmails : [];

    // 2) 구버전 호환: ownerEmail이 있으면 포함
    if (ownerEmail) list = [...list, ownerEmail];

    // 3) 최종적으로 아무 것도 없으면 세션 이메일 보완(최소 1개)
    if (list.length === 0) {
      try {
        const { userEmail } = await getLocalIdentity();
        if (userEmail) list = [userEmail];
      } catch { /* ignore */ }
    }

    // 정규화 + 중복 제거
    const uniq = Array.from(new Set(list.map(normEmail).filter(Boolean)));
    return uniq;
  }, [recipientEmails, ownerEmail]);

  const handleCloseLost = useCallback(async () => {
    if (status === 'RESOLVED') return;
    if (lockingRef.current) return;
    lockingRef.current = true;

    const hasValidPostId = typeof postId === 'string' && postId.length > 0;
    if (hasValidPostId && lastSuccessPostIdRef.current === postId) {
      lockingRef.current = false;
      return;
    }

    // 낙관적 전환
    setStatus('RESOLVED');

    try {
      // ✅ 0) 서버에 상태 업데이트 (가장 먼저 실행) - 이 부분이 새로 추가됨
      if (hasValidPostId) {
        try {
          await updateLostItemStatus(postId!, 'RETURNED');
          console.log(`[useLostClose] ✅ 서버 상태 업데이트 성공: ${postId}`);
        } catch (err) {
          console.error('[useLostClose] ❌ 서버 상태 업데이트 실패:', err);
          // 서버 업데이트 실패 시 롤백
          if (rollbackOnError) setStatus('OPEN');
          Alert.alert('오류', '서버 연결에 문제가 있어요. 다시 시도해주세요.');
          lockingRef.current = false;
          return; // 실패 시 이후 로직 중단
        }
      }
      // ✅ 여기까지 추가

      // 1) 채팅 시스템 메시지
      pushMessage({
        id: `sys_close_${Date.now()}`,
        type: 'system',
        text: '분실물이 회수 처리되었습니다. 마이페이지 > 거래내역 > 분실물 탭의 회수 목록에 반영됩니다.',
        time: formatKoreanTime(),
        mine: true,
      });

      // 2) 채팅 리스트 프리뷰 갱신
      if (roomId) await updateRoomOnSend(roomId, '상태: 해결 완료');

      // 3) 거래내역(회수) 저장
      if (!hasValidPostId) {
        Alert.alert('안내', '게시글 ID를 확인할 수 없어 회수 내역 저장을 건너뜁니다.');
        return;
      }

      const recipients = await resolveRecipients();
      if (recipients.length === 0) {
        Alert.alert('안내', '회수 내역을 저장할 계정 이메일을 확인할 수 없어요.');
        return;
      }

      await upsertRecoveredLostItemsForRecipients(
        {
          postId: postId!,
          title: (postTitle ?? '분실물 게시글').trim(),
          image: postImageUri,
          place,
          recoveredAt: new Date().toISOString(),
          roomId: roomId ?? undefined,
        },
        recipients
      );

      // 4) 화면 갱신 이벤트
      DeviceEventEmitter.emit(EVT_TRADE_HISTORY_UPDATED, {
        scope: 'lost-recovered',
        postId,
      } as { scope: 'lost-recovered'; postId: string });

      lastSuccessPostIdRef.current = postId!;

    } catch (e) {
      console.log('useLostClose.handleCloseLost error', e);
      if (rollbackOnError) setStatus('OPEN');
      Alert.alert('오류', '회수 처리 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      lockingRef.current = false;
    }
  }, [status, roomId, postId, postTitle, postImageUri, place, resolveRecipients, pushMessage, rollbackOnError]);

  const confirmAndClose = useCallback(() => {
    if (status === 'RESOLVED') return;
    Alert.alert(
      '회수 처리',
      '분실물을 회수 처리하시겠어요? 처리 후에는 거래내역에 반영됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '확인', style: 'destructive', onPress: handleCloseLost },
      ],
    );
  }, [status, handleCloseLost]);

  return {
    lostStatus: status,
    handleCloseLost,
    confirmAndClose,
    EVT_TRADE_HISTORY_UPDATED,
  };
}
