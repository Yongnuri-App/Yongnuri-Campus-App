import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useImagePicker } from '../../hooks/useImagePicker';
import type { ChatRoomParams, RootStackParamList } from '../../types/navigation';
import styles from './DetailBottomBar.styles';

import { api } from '@/api/client';
import { upsertRoomOnOpen } from '@/storage/chatStore';
import type { ChatCategory } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import { buildMarketRoomId } from '@/utils/openChatRoom';

type Variant = 'detail' | 'chat';
type ChatAutoNavigateParams = ChatRoomParams;

type Props = {
  variant?: Variant;
  initialLiked?: boolean;
  onToggleLike?: (liked: boolean) => void;
  onPressSend?: (message: string) => void;
  onAddImages?: (uris: string[]) => void;
  placeholder?: string;
  disabled?: boolean;

  heartIconSrc?: any;
  heartIconActiveSrc?: any;
  plusIconSrc?: any;

  bottomInset?: number;
  chatAutoNavigateParams?: ChatAutoNavigateParams;

  imagePickerMax?: number;
  clearPickedAfterNotify?: boolean;
  attachmentsCount?: number;
};

/* ------------ 유틸 ------------ */
const toNum = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
};
const ensureStr = (v: unknown, fb = ''): string =>
  typeof v === 'string' ? v : v != null ? String(v) : fb;

/* ------------ 채팅타입 매핑 ------------ */
type ChatTypeEnum = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY';
function mapSourceToChatType(source?: string): ChatTypeEnum {
  switch ((source ?? '').toLowerCase()) {
    case 'lost':
      return 'LOST_ITEM';
    case 'groupbuy':
      return 'GROUP_BUY';
    case 'market':
    default:
      return 'USED_ITEM';
  }
}

/* ------------ 서버 방 생성(보내는 사람은 토큰으로 판별) ------------ */
// DetailBottomBar.tsx 내부의 createOrGetRoomOnServer 교체본
async function createOrGetRoomOnServer(args: {
  source: 'market' | 'lost' | 'groupbuy';
  typeId: number;
  toUserId: number;
  message: string;
}): Promise<number | undefined> {
  const payload = {
    type: mapSourceToChatType(args.source),
    typeId: args.typeId,
    toUserId: args.toUserId,
    message: args.message,
    messageType: 'text',
  };

  try {
    console.log('[chat] createOrGetRoom payload', payload);
    // ❗ timeout 옵션 제거 (전역 axios 기본값 사용)
    const res = await api.post('/chat/rooms', payload);
    const roomId = res?.data?.roomInfo?.roomId;
    return typeof roomId === 'number' ? roomId : undefined;
  } catch (e: any) {
    // 여기서는 로그만 남기고, 네비/로컬 채팅은 그대로 진행
    console.log('[chat] createOrGetRoom error', e?.response?.status, e?.message || e);
    return undefined;
  }
}

/* ================================================================== */

const DetailBottomBar: React.FC<Props> = ({
  variant = 'detail',
  initialLiked = false,
  onToggleLike,
  onPressSend,
  onAddImages,
  placeholder = '메세지를 입력해주세요.',
  disabled = false,
  heartIconSrc = require('../../assets/images/heart.png'),
  heartIconActiveSrc = require('../../assets/images/redheart.png'),
  plusIconSrc = require('../../assets/images/plus_grey.png'),
  bottomInset = 0,
  chatAutoNavigateParams,
  clearPickedAfterNotify = true,
  attachmentsCount = 0,
  imagePickerMax,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [liked, setLiked] = useState(initialLiked);
  const [text, setText] = useState('');

  const { images: pickedImages, setImages: setPickedImages, openAdd, remain } =
    useImagePicker({ max: imagePickerMax ?? 10 });

  useEffect(() => setLiked(initialLiked), [initialLiked]);

  const canSend = useMemo(
    () => (!!text.trim() || attachmentsCount > 0) && !disabled,
    [text, attachmentsCount, disabled]
  );

  const handleToggleLike = () => {
    const next = !liked;
    setLiked(next);
    onToggleLike?.(next);
  };

  const handlePressPlus = () => {
    if (disabled) return;
    openAdd();
  };

  useEffect(() => {
    if (variant !== 'chat') return;
    if (!pickedImages || pickedImages.length === 0) return;
    onAddImages?.(pickedImages);
    if (clearPickedAfterNotify) setPickedImages([]);
  }, [pickedImages, variant, onAddImages, clearPickedAfterNotify, setPickedImages]);

  /** 상세 → 방 생성(가능하면) + 네비게이션 */
  const handlePressSend = async () => {
    if (!canSend) return;
    const msg = text.trim();

    if (variant === 'detail') {
      if (!chatAutoNavigateParams) {
        Alert.alert('알림', '채팅방 이동 정보를 찾을 수 없어요.');
      } else {
        // (A) roomId/목록 프리뷰 준비
        let roomId = '';
        let category: ChatCategory = 'market';
        let nickname = '';
        let productTitle: string | undefined;
        let productPrice: number | undefined;
        let productImageUri: string | undefined;

        // ✅ 현재 로그인 사용자(= 구매자) 메타 확보
        const { userEmail, userId } = await getLocalIdentity();
        const buyer = { email: userEmail ?? null, id: userId ?? null };

        if (chatAutoNavigateParams.source === 'market') {
          const p = chatAutoNavigateParams;
          category = 'market';
          nickname = p.sellerNickname;
          productTitle = p.productTitle;
          productPrice = p.productPrice;
          productImageUri = p.productImageUri;

          // ✅ 판매자 메타(작성자) 보강: authorEmail/authorId가 있으면 사용
          const seller = {
            email: (p as any).authorEmail ?? null,
            id: (p as any).authorId ?? null,
            nickname: p.sellerNickname,
          };
          // ✅ 충돌 없는 roomId 생성 (post + seller + buyer)
          roomId = buildMarketRoomId(String(p.postId), seller, buyer);
        } else if (chatAutoNavigateParams.source === 'lost') {
          // (참고) 분실물도 동일한 원리 적용 권장: poster(상대) + buyer(나)
          const p = chatAutoNavigateParams as any;
          category = 'lost';
          nickname = p.posterNickname;
          productTitle = p.postTitle;
          productImageUri = p.postImageUri;

          // 간단 폴백 roomId (필요시 openChatRoom에 lost용 빌더 추가 권장)
          const posterKey = (p.posterEmail ?? p.authorEmail ?? p.posterId ?? p.authorId ?? '').toString().toLowerCase();
          const buyerKey = (buyer.email ?? buyer.id ?? '').toString().toLowerCase();
          roomId = `l_${p.postId}__poster_${posterKey}__u_${buyerKey}`;
        } else {
          // groupbuy
          const p = chatAutoNavigateParams as any;
          category = 'group';
          nickname = p.authorNickname;
          productTitle = p.postTitle;
          productImageUri = p.postImageUri;

          const authorKey = (p.authorEmail ?? p.authorId ?? '').toString().toLowerCase();
          const buyerKey = (buyer.email ?? buyer.id ?? '').toString().toLowerCase();
          roomId = `g_${p.postId}__a_${authorKey}__u_${buyerKey}`;
        }

        // ✅ 쓰레드 키가 "판매자+구매자"를 포함하도록 origin.params에 buyer 식별자 주입
        // makeThreadKey는 p1= seller/author, p2= buyer/opponent/user* 를 참고하므로,
        // 여기서 buyerEmail/buyerId(or userEmail/userId) 를 넣어주면 충돌이 사라집니다.
        const originParams = {
          ...chatAutoNavigateParams,
          buyerEmail: buyer.email ?? undefined,
          buyerId: buyer.id != null ? String(buyer.id) : undefined,
          userEmail: buyer.email ?? undefined, // 보조 키
          userId: buyer.id != null ? String(buyer.id) : undefined, // 보조 키
        };

        await upsertRoomOnOpen({
          roomId,
          category,
          nickname,
          productTitle,
          productPrice,
          productImageUri,
          preview: msg,
          origin: {
            source: chatAutoNavigateParams.source,
            params: originParams,
          },
        });

        // --- (B) 서버 방 생성 시도 (상대 toUserId는 판매자/작성자/상대 기준)
        let serverRoomId: number | undefined = undefined;
        try {
          const src = chatAutoNavigateParams.source; // 'market' | 'lost' | 'groupbuy'
          const typeId = toNum((chatAutoNavigateParams as any)?.postId);

          const p: any = chatAutoNavigateParams;
          let toUserId =
            toNum(p.sellerId) ??
            toNum(p.authorId) ??
            toNum(p.opponentId) ??
            undefined;

          if (!toUserId) {
            const targetEmail =
              ensureStr(p.sellerEmail) ||
              ensureStr(p.authorEmail) ||
              ensureStr(p.opponentEmail) ||
              '';
            if (targetEmail) {
              console.log('[chat] only email present for opponent (no ID):', targetEmail);
            }
          }

          if (typeId && toUserId) {
            serverRoomId = await createOrGetRoomOnServer({
              source: src as any,
              typeId,
              toUserId,
              message: msg,
            });
          } else {
            console.log('[chat] createOrGetRoom missing ids (typeId/toUserId)', { typeId, toUserId });
          }
        } catch (e) {
          console.log('[chat] createOrGetRoom skipped (error)', e);
        }

        // --- (C) ChatRoom으로 네비: ✅ 계산한 roomId를 반드시 넘긴다
        navigation.navigate('ChatRoom', {
          ...originParams,     // buyer 식별자 포함된 파라미터
          roomId,              // ✅ 필수
          initialMessage: msg,
          serverRoomId,
        } as any);
      }
    } else {
      onPressSend
        ? onPressSend(msg)
        : Alert.alert('알림', '전송 핸들러가 연결되지 않았습니다.');
    }

    setText('');
  };

  const LeftButton = () =>
    variant === 'detail' ? (
      <TouchableOpacity
        onPress={handleToggleLike}
        activeOpacity={0.8}
        style={styles.heartBtn}
        accessibilityRole="button"
        accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
        disabled={disabled}
      >
        <Image
          source={liked ? heartIconActiveSrc : heartIconSrc}
          style={styles.heartIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        onPress={handlePressPlus}
        activeOpacity={0.8}
        style={styles.heartBtn}
        accessibilityRole="button"
        accessibilityLabel="이미지 추가"
        disabled={disabled || remain <= 0}
      >
        <Image source={plusIconSrc} style={styles.heartIcon} resizeMode="contain" />
      </TouchableOpacity>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={styles.kav}
    >
      <View style={[styles.safe, { paddingBottom: bottomInset }]}>
        <View style={[styles.wrap, disabled && { opacity: 0.6 }]}>
          <LeftButton />

          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#A6A6A6"
              value={text}
              onChangeText={setText}
              editable={!disabled}
              returnKeyType="send"
              onSubmitEditing={handlePressSend}
            />
          </View>

          <TouchableOpacity
            onPress={handlePressSend}
            activeOpacity={!!text.trim() || attachmentsCount > 0 ? 0.9 : 1}
            style={[
              styles.sendBtn,
              !((!!text.trim() || attachmentsCount > 0) && !disabled) &&
                styles.sendBtnDisabled,
            ]}
            disabled={!((!!text.trim() || attachmentsCount > 0) && !disabled)}
            accessibilityRole="button"
            accessibilityLabel="전송"
          >
            <Text style={styles.sendText}>전송</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default DetailBottomBar;
