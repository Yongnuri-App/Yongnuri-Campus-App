import type { LostSimpleStatus } from '@/components/Chat/LostCloseButton/LostCloseButton';
import { updateRoomOnSend } from '@/storage/chatStore';
import type { ChatMessage } from '@/types/chat';
import { formatKoreanTime } from '@/utils/chatTime';
import { useCallback, useState } from 'react';

type Options = {
  roomId: string | null;
  initial: LostSimpleStatus;
  pushMessage: (msg: ChatMessage) => void;
};

export default function useLostClose({ roomId, initial, pushMessage }: Options) {
  const [status, setStatus] = useState<LostSimpleStatus>(initial);

  const handleCloseLost = useCallback(async () => {
    if (status === 'RESOLVED') return;

    // 1) 상태 즉시 반영
    setStatus('RESOLVED');

    // 2) 시스템 메시지
    pushMessage({
      id: `sys_close_${Date.now()}`,
      type: 'text',
      text: '✅ 분실물 상태가 "해결됨"으로 변경되었습니다.',
      time: formatKoreanTime(),
      mine: true,
    });

    // 3) 리스트 프리뷰 갱신
    if (roomId) {
      await updateRoomOnSend(roomId, '상태: 해결됨');
    }

    // TODO: 서버 PATCH 연동
    // await LostRepo.updateStatus(postId, 'RESOLVED');
  }, [status, roomId, pushMessage]);

  return {
    lostStatus: status,
    handleCloseLost,
  };
}
