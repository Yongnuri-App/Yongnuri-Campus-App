// hooks/useSaleStatusManager.ts
import { createMakeDeal, type PostType } from '@/api/makedeal';
import { patchMarketStatus } from '@/api/market';
import type { SaleStatusLabel } from '@/components/Chat/SaleStatusSelector/SaleStatusSelector';
import marketTradeRepo from '@/repositories/trades/MarketTradeRepo';
import type { BlockedUser } from '@/utils/blocked';
import { labelToServer, toServerDate, toServerTime } from '@/utils/chatRoomHelpers';
import { getLocalIdentity } from '@/utils/localIdentity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type UseSaleStatusManagerParams = {
  initialStatus: SaleStatusLabel;
  generalizedPostId: string | null;
  serverRoomId?: number;
  ensureServerRoomId: () => Promise<number | undefined>;
  myId: string | null;
  buyerIdFromRoom: number | null;
  raw: any;
  enriched: any;
  isMarketContext: boolean;
  isLostContext: boolean;
  opponent: BlockedUser | null;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  pushSystemAppointment: (date: string, time: string, place: string) => void;
};

export default function useSaleStatusManager({
  initialStatus,
  generalizedPostId,
  serverRoomId,
  ensureServerRoomId,
  myId,
  buyerIdFromRoom,
  raw,
  enriched,
  isMarketContext,
  opponent,
  setMessages,
  pushSystemAppointment,
  isLostContext,
}: UseSaleStatusManagerParams) {
  const [saleStatusLabel, setSaleStatusLabel] = useState<SaleStatusLabel>(initialStatus);
  const [hasAppointment, setHasAppointment] = useState(false);

  /** 판매 상태 변경 */
  const handleChangeSaleStatus = useCallback(
    async (nextLabel: SaleStatusLabel, skipAppointmentCheck = false) => {
      // 약속 없이 예약중 변경 시도 → 모달 유도
      if (nextLabel === '예약중' && !hasAppointment && !skipAppointmentCheck) {
        return 'need-appointment';
      }

      const prev = saleStatusLabel;
      setSaleStatusLabel(nextLabel);

      try {
        const postIdStr = generalizedPostId;
        if (!postIdStr) throw new Error('postId 미확인');

        const serverStatus = labelToServer(nextLabel);

        // RESERVED/SOLD 시 buyerId 필수
        let buyerId: number | null | undefined = undefined;
        if (serverStatus === 'RESERVED' || serverStatus === 'SOLD') {
          const rawCandidate = buyerIdFromRoom ?? raw?.buyerId ?? raw?.opponentId;
          if (rawCandidate == null) throw new Error('구매자 정보를 확인할 수 없습니다.');
          
          const candNum = Number(rawCandidate);
          const myIdNum = myId != null ? Number(myId) : NaN;
          
          if (!Number.isFinite(candNum)) throw new Error('구매자 ID가 올바르지 않습니다.');
          if (candNum === myIdNum) throw new Error('본인을 구매자로 지정할 수 없습니다.');
          
          buyerId = candNum;
          console.log('[handleChangeSaleStatus] ✅ 구매자 ID:', buyerId);
        }

        // 서버 룸 ID 확보
        let rid = serverRoomId;
        if (!rid) {
          rid = await ensureServerRoomId();
          if (!rid) throw new Error('서버 채팅방 ID를 확인할 수 없어요.');
        }

        // 서버 호출
        await patchMarketStatus(Number(postIdStr), serverStatus, buyerId, Number(rid));

        // 로컬 캐시 업데이트
        try {
          const KEY = 'market_posts_v1';
          const rawList = await AsyncStorage.getItem(KEY);
          const list = rawList ? JSON.parse(rawList) : [];
          const updated = Array.isArray(list)
            ? list.map((it: any) =>
                String(it?.id ?? it?.postId) === String(postIdStr)
                  ? { ...it, saleStatus: nextLabel }
                  : it
              )
            : list;
          await AsyncStorage.setItem(KEY, JSON.stringify(updated));
        } catch (e) {
          console.log('updateMarketCacheStatus error', e);
        }
      } catch (e: any) {
        setSaleStatusLabel(prev);
        const msg = e?.message ?? '상태 변경 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.';
        Alert.alert('오류', msg);
      }
    },
    [
      hasAppointment,
      saleStatusLabel,
      generalizedPostId,
      buyerIdFromRoom,
      raw,
      myId,
      serverRoomId,
      ensureServerRoomId,
    ]
  );

  /** 거래 완료 처리 */
  const recordTradeCompletion = useCallback(async () => {
    try {
      if (!isMarketContext || !raw?.postId) return;

      const { userEmail: meEmail, userId: meId } = await getLocalIdentity();
      const meEmailNorm = (meEmail ?? '').trim().toLowerCase();
      const meIdStr = (meId ?? '').toString();

      let buyerEmailY = raw?.buyerEmail ?? raw?.opponentEmail ?? null;
      let buyerIdY = buyerEmailY ? null : (opponent?.id ? String(opponent.id) : null);

      const buyerEmailNorm = (buyerEmailY ?? '').trim().toLowerCase();
      if (buyerEmailNorm && meEmailNorm && buyerEmailNorm === meEmailNorm) {
        buyerEmailY = null;
        buyerIdY = buyerIdY ?? (raw?.buyerId ? String(raw.buyerId) : null);
      }
      if (!buyerEmailY && buyerIdY && meIdStr && buyerIdY === meIdStr) {
        buyerIdY = null;
      }

      await marketTradeRepo.upsert({
        postId: String(raw.postId),
        title: raw?.productTitle ?? '게시글 제목',
        price: Number(raw?.productPrice) || undefined,
        image: raw?.productImageUri,
        sellerEmail: meEmail ?? raw?.sellerEmail ?? null,
        sellerId: meId ?? (raw?.sellerId ? String(raw.sellerId) : null),
        buyerEmail: buyerEmailY,
        buyerId: buyerIdY,
        postCreatedAt: raw?.postCreatedAt ?? raw?.createdAt,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          type: 'system',
          text: '판매자가 거래를 완료로 변경했어요. 구매자 거래내역에 반영됩니다.',
          time: new Date().toISOString(),
          senderEmail: null,
          senderId: null,
        } as any,
      ]);
    } catch (e) {
      console.log('recordTradeCompletion error', e);
      Alert.alert('오류', '거래완료 처리 중 문제가 발생했어요. 다시 시도해주세요.');
    }
  }, [isMarketContext, raw, opponent, setMessages]);

  /** 약속 생성 */
  const createAppointment = useCallback(
    async (params: { date?: string; time?: string; place?: string }) => {
      const { date, time, place } = params;

      // 1) 유효성
      if (!date || !time || !place) {
        Alert.alert('확인', '날짜/시간/장소를 모두 선택해주세요.');
        return false;
      }
      if (!serverRoomId) {
        Alert.alert('오류', '서버 채팅방 ID를 확인할 수 없어요.');
        return false;
      }
      const postIdStr = generalizedPostId;
      if (!postIdStr) {
        Alert.alert('오류', '게시글 정보를 확인할 수 없어요.');
        return false;
      }

      // 2) 구매자 ID 계산
      const buyerIdRaw =
        buyerIdFromRoom ??
        raw?.buyerId ??
        raw?.opponentId ??
        raw?.opponentUserId ??
        raw?.userId ??
        (enriched?.buyerId != null ? Number(enriched.buyerId) : null);

      const buyerId = buyerIdRaw != null ? Number(buyerIdRaw) : NaN;
      const myIdAsNum = myId != null ? Number(myId) : NaN;
      const buyerIdIsMe =
        Number.isFinite(buyerId) && Number.isFinite(myIdAsNum) && buyerId === myIdAsNum;

      if (!Number.isFinite(buyerId) || buyerIdIsMe) {
        console.log('[makeDeal] raw params:', raw);
        console.log('[makeDeal] buyerIdFromRoom:', buyerIdFromRoom, 'enriched.buyerId:', enriched?.buyerId);
        Alert.alert('오류', '상대 사용자 정보를 확인할 수 없어요.');
        return false;
      }

      // 3) 게시글 타입
      const postType: PostType = isMarketContext ? 'USED_ITEM' : isLostContext ? 'LOST_ITEM' : 'USED_ITEM';

      // 4) 날짜/시간 변환
      const yyyyMmDd = toServerDate(date);
      const hhmm = toServerTime(time);
      if (!yyyyMmDd || !hhmm) {
        Alert.alert('오류', '날짜/시간 형식을 변환하는 중 문제가 발생했어요.');
        return false;
      }

      // 5) 서버 호출 (✅ 3시간 전 알림 요청)
      try {
        await createMakeDeal({
          chatRoomId: Number(serverRoomId),
          buyerId,
          postType,
          postId: Number(postIdStr),
          date: yyyyMmDd,
          time: hhmm,
          location: place,
          notifyBeforeHours: 3, // ✅ 여기 추가
        });

        // 성공 처리
        setHasAppointment(true);
        pushSystemAppointment(date, time, place);
        Alert.alert('완료', '약속이 생성되었습니다.');

        // 자동으로 예약중 변경
        await handleChangeSaleStatus('예약중', true);
        return true;
      } catch (e: any) {
        console.log('[makeDeal] create error', e);
        Alert.alert('오류', '약속 생성 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
        return false;
      }
    },
    [
      serverRoomId,
      generalizedPostId,
      buyerIdFromRoom,
      raw,
      enriched,
      myId,
      isMarketContext,
      isLostContext,
      pushSystemAppointment,
      handleChangeSaleStatus,
    ]
  );

  return {
    saleStatusLabel,
    setSaleStatusLabel,
    hasAppointment,
    setHasAppointment,
    handleChangeSaleStatus,
    recordTradeCompletion,
    createAppointment,
  };
}
