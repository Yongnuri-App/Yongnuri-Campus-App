// utils/openChat.ts
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createOrGetRoom, type ChatType } from '@/api/chat';

type Source = 'market' | 'lost' | 'groupbuy';

function mapSourceToChatType(source: Source): ChatType {
  switch (source) {
    case 'lost': return 'LOST_ITEM';
    case 'groupbuy': return 'GROUP_BUY';
    default: return 'USED_ITEM';
  }
}

type OpenChatParams = {
  navigation: NativeStackNavigationProp<any>;
  source: Source;               // 'market' | 'lost' | 'groupbuy'
  typeId: number;               // 게시글 ID
  toUserId: number;             // 상대 유저 ID(게시글 작성자 등)
  initialText: string;          // 첫 메시지
  // 아래 메타는 채팅 헤더카드/리스트 미리보기용
  meta?: {
    productTitle?: string;
    productPrice?: number;
    productImageUri?: string;
    postTitle?: string;
    place?: string;
    purpose?: 'lost' | 'found';
    recruitLabel?: string;
    sellerNickname?: string;
    buyerNickname?: string;
    opponentNickname?: string;
  };
};

export async function openChatFromDetail({
  navigation, source, typeId, toUserId, initialText, meta
}: OpenChatParams) {
  try {
    // 1) 방 생성 + 첫 메시지 서버에 저장(백엔드 권장 루트)
    const res = await createOrGetRoom({
      type: mapSourceToChatType(source),
      typeId,
      toUserId,
      message: initialText,
      messageType: 'text',
    });

    const serverRoomId = res?.roomInfo?.roomId;
    if (typeof serverRoomId === 'number') {
      // 2) serverRoomId를 들고 채팅방으로 이동 (초기 메시지는 서버가 이미 보관)
      navigation.navigate('ChatRoom', {
        serverRoomId,
        source,
        // 헤더카드/리스트 미리보기용 메타
        productTitle: meta?.productTitle,
        productPrice: meta?.productPrice,
        productImageUri: meta?.productImageUri,
        postTitle: meta?.postTitle,
        place: meta?.place,
        purpose: meta?.purpose,
        recruitLabel: meta?.recruitLabel,
        sellerNickname: meta?.sellerNickname,
        buyerNickname: meta?.buyerNickname,
        opponentNickname: meta?.opponentNickname,
        // ✅ 여기서는 initialMessage를 넘기지 않음(중복 방지)
      });
      return;
    }

    // (fallback) 혹시라도 서버 방 생성이 실패하면: 로컬 낙관적 seed로 먼저 보여주고,
    // ChatRoomPage의 ensureServerRoomId가 재시도하여 서버에 전송하도록 한다.
    navigation.navigate('ChatRoom', {
      source,
      initialMessage: initialText,
      productTitle: meta?.productTitle,
      productPrice: meta?.productPrice,
      productImageUri: meta?.productImageUri,
      postTitle: meta?.postTitle,
      place: meta?.place,
      purpose: meta?.purpose,
      recruitLabel: meta?.recruitLabel,
      sellerNickname: meta?.sellerNickname,
      buyerNickname: meta?.buyerNickname,
      opponentNickname: meta?.opponentNickname,
    });
  } catch (e) {
    // 완전 실패 시에도 UX 막히지 않게 fallback 네비게이션
    navigation.navigate('ChatRoom', {
      source,
      initialMessage: initialText,
      productTitle: meta?.productTitle,
      productPrice: meta?.productPrice,
      productImageUri: meta?.productImageUri,
      postTitle: meta?.postTitle,
      place: meta?.place,
      purpose: meta?.purpose,
      recruitLabel: meta?.recruitLabel,
      sellerNickname: meta?.sellerNickname,
      buyerNickname: meta?.buyerNickname,
      opponentNickname: meta?.opponentNickname,
    });
  }
}
