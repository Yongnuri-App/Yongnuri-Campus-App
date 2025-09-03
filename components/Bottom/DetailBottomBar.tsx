// components/Bottom/DetailBottomBar.tsx
// React Native (Expo, TypeScript)
// ⚠️ 기존 ChatRoom 네비게이션 파라미터(키 이름들) "절대 변경하지 않음"
//    → 단지 ChatList 노출을 위해 네비 직전에 upsertRoomOnOpen 저장만 추가
//    → preview(=내가 방금 입력한 텍스트)를 저장해서 리스트에 곧바로 마지막 메시지가 보이게 함

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
import type { RootStackParamList } from '../../types/navigation';
import styles from './DetailBottomBar.styles';

// ✅ ChatList가 읽어갈 로컬 저장 (리스트 즉시 반영용)
import { upsertRoomOnOpen } from '@/storage/chatStore';
import type { ChatCategory } from '@/types/chat';

/** 어떤 화면에서 쓰는지 구분 */
type Variant = 'detail' | 'chat';

/** ✅ 상세 → ChatRoom으로 넘길 정보 (기존 형태 그대로 유지) */
type ChatAutoNavigateParams =
  | {
      /** 중고거래에서 진입 */
      source: 'market';
      postId: string;
      sellerNickname: string;
      productTitle: string;
      productPrice: number;        // 숫자(KRW), 0=나눔
      productImageUri?: string;    // 썸네일 URL(없어도 OK)
    }
  | {
      /** 분실물에서 진입 */
      source: 'lost';
      postId: string;
      posterNickname: string;      // 게시자 닉네임
      postTitle: string;           // 글 제목
      place: string;               // 분실/습득 장소
      purpose: 'lost' | 'found';   // 분실/습득
      postImageUri?: string;
    }
  | {
      /** 공동구매에서 진입 */
      source: 'groupbuy';          // ⚠️ 리스트 필터는 'group'이라 저장 시 매핑
      postId: string;
      authorNickname: string;      // 작성자 닉네임
      postTitle: string;           // 글 제목
      recruitLabel: string;        // 헤더 보조 라벨(예: "현재 3명 (10명)")
      postImageUri?: string;       // 썸네일 URL
    };

type Props = {
  /** 기본값은 'detail' (※ 채팅 화면에서는 반드시 variant="chat"으로 넘겨주세요) */
  variant?: Variant;

  // 상세 화면: 좋아요
  initialLiked?: boolean;
  onToggleLike?: (liked: boolean) => void;

  // 채팅 화면: 텍스트 전송 콜백
  onPressSend?: (message: string) => void;

  // 채팅 화면: 이미지 선택됨 콜백 (이번에 고른 URI들을 그대로 전달)
  onAddImages?: (uris: string[]) => void;

  placeholder?: string;
  disabled?: boolean;

  // 아이콘 주입
  heartIconSrc?: any;
  heartIconActiveSrc?: any;
  plusIconSrc?: any;

  bottomInset?: number;

  // ✅ 상세 화면: 전송 시 자동 네비 파라미터(중고/분실/공동구매 공용) — 기존 키 유지
  chatAutoNavigateParams?: ChatAutoNavigateParams;

  // 채팅 화면: 이미지 선택 옵션
  imagePickerMax?: number;
  /** 부모에 알린 뒤 내부 버퍼를 비울지 (기본 true) */
  clearPickedAfterNotify?: boolean;

  /** 현재 첨부된 이미지 개수(부모 상태). 0 초과면 텍스트가 비어도 전송버튼 활성화 */
  attachmentsCount?: number;
};

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
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [liked, setLiked] = useState(initialLiked);
  const [text, setText] = useState('');

  // 훅은 조건부 호출 금지. chat 모드에서만 결과를 사용합니다.
  const { images: pickedImages, setImages: setPickedImages, openAdd, remain } =
    useImagePicker({ max: 10 });

  /** 외부 초기 좋아요 값 변경 시 동기화 */
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  /** ✅ 전송 가능: (텍스트 있거나 첨부가 1개 이상) && 비활성 아님 */
  const canSend = useMemo(
    () => (!!text.trim() || attachmentsCount > 0) && !disabled,
    [text, attachmentsCount, disabled]
  );

  /** (detail) 좋아요 토글 */
  const handleToggleLike = () => {
    const next = !liked;
    setLiked(next);
    onToggleLike?.(next);
  };

  /** (chat) + 버튼 → 이미지 추가 */
  const handlePressPlus = () => {
    if (disabled) return;
    openAdd();
  };

  /** ✅ (chat) 이미지 선택 감지: 선택된 걸 통째로 부모로 전달 → 내부 버퍼 비우기(기본) */
  useEffect(() => {
    if (variant !== 'chat') return;
    if (!pickedImages || pickedImages.length === 0) return;

    // 이번 선택분 전체 전달
    onAddImages?.(pickedImages);

    // 중복 전달 방지: 내부 버퍼 초기화(옵션)
    if (clearPickedAfterNotify) {
      setPickedImages([]);
    }
  }, [pickedImages, variant, onAddImages, clearPickedAfterNotify, setPickedImages]);

  /**
   * ✅ 전송
   * - detail 모드: (1) 로컬에 방 upsert(미리보기 포함) 후, (2) **기존 네비 파라미터 그대로** ChatRoom으로 이동
   * - chat 모드: 상위에서 전달한 전송 핸들러 호출
   */
  const handlePressSend = async () => {
    if (!canSend) return;
    const msg = text.trim();

    if (variant === 'detail') {
      if (!chatAutoNavigateParams) {
        Alert.alert('알림', '채팅방 이동 정보를 찾을 수 없어요.');
      } else {
        // === (1) ChatList 노출 위해 upsert만 수행 (네비 파라미터는 수정하지 않음) ===
        //     - category: 'groupbuy'는 저장 시 'group'으로만 매핑 (리스트 필터 호환 목적)
        let roomId = '';
        let category: ChatCategory = 'market';
        let nickname = '';
        let productTitle: string | undefined;
        let productPrice: number | undefined;
        let productImageUri: string | undefined;

        if (chatAutoNavigateParams.source === 'market') {
          const p = chatAutoNavigateParams;
          category = 'market';
          roomId = `market-${p.postId}-${p.sellerNickname}`;
          nickname = p.sellerNickname;
          productTitle = p.productTitle;
          productPrice = p.productPrice;
          productImageUri = p.productImageUri;
        } else if (chatAutoNavigateParams.source === 'lost') {
          const p = chatAutoNavigateParams;
          category = 'lost';
          roomId = `lost-${p.postId}-${p.posterNickname}`;
          nickname = p.posterNickname;
          productTitle = p.postTitle;     // 분실물은 제목 사용
          productImageUri = p.postImageUri;
        } else {
          // source === 'groupbuy'
          const p = chatAutoNavigateParams;
          category = 'group';             // ✅ 저장 전용 매핑 (UI 필터 호환)
          roomId = `group-${p.postId}-${p.authorNickname}`;
          nickname = p.authorNickname;
          productTitle = p.postTitle;
          productImageUri = p.postImageUri;
        }

        // ✅ preview에 내가 보낸 텍스트(msg)를 넣어, 리스트에 즉시 마지막 메시지가 보이도록 함
        await upsertRoomOnOpen({
          roomId,
          category,
          nickname,
          productTitle,
          productPrice,
          productImageUri,
          preview: msg,
          origin: {
            source: chatAutoNavigateParams.source,   // 'market' | 'lost' | 'groupbuy'
            params: chatAutoNavigateParams,          // ✅ 기존 네비 파라미터 원본 그대로 보관!
          },
        });

        // === (2) ChatRoom으로 이동: 네가 쓰던 파라미터 형태를 1도 바꾸지 않음 ===
        navigation.navigate('ChatRoom', {
          ...chatAutoNavigateParams, // ✅ 기존 키 그대로( sellerNickname / postTitle / recruitLabel 등 )
          initialMessage: msg,       // (선택) ChatRoom에서 초기 전송 처리 시 사용
        } as any);

        // (옵션) 디버그 로그 — 필요 없으면 제거
        // console.log('[CHAT][Detail] upsert & navigate (no param shape change)', {
        //   roomId,
        //   category,
        //   from: chatAutoNavigateParams.source,
        // });
      }
    } else {
      // 채팅 화면
      onPressSend
        ? onPressSend(msg)
        : Alert.alert('알림', '전송 핸들러가 연결되지 않았습니다.');
    }

    setText(''); // 입력 초기화
  };

  /** 좌측 버튼: detail=♥ / chat=＋ */
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
    // iOS에서 키보드 올라올 때 바가 살짝 위로 이동
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={styles.kav}
    >
      <View style={[styles.safe, { paddingBottom: bottomInset }]}>
        <View style={[styles.wrap, disabled && { opacity: 0.6 }]}>
          {/* 좌측: detail=하트 / chat=플러스 */}
          <LeftButton />

          {/* 입력 */}
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

          {/* 전송 */}
          <TouchableOpacity
            onPress={handlePressSend}
            activeOpacity={canSend ? 0.9 : 1}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            disabled={!canSend}
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
