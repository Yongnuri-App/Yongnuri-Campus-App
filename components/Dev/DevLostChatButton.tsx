import type { RootStackParamList } from '@/types/navigation';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import styles from './DevLostChatButton.styles';

/** 분실물 글의 최소 정보 타입 (페이지/리스트에서 받아 사용) */
export type LostPostMini = {
  id: string;                       // postId
  title?: string;                   // postTitle
  imageUri?: string;                // postImageUri
  place?: string;                   // 장소 간단 표기
  purpose?: 'lost' | 'found';       // 분실 or 습득
  posterNickname?: string;          // 작성자(닉네임)
  authorId?: string;                // 작성자 ID
  authorEmail?: string;             // 작성자 이메일
};

type Props = {
  post: LostPostMini;
};

/**
 * DEV 전용: 분실물 ChatRoom 진입 버튼
 * - OWNER / GUEST 두 케이스를 빠르게 테스트 가능
 * - __DEV__가 아니면 아무것도 렌더링하지 않음
 */
export default function DevLostChatButton({ post }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!__DEV__) return null; // 프로덕션 빌드에서는 숨김

  // 안전한 디폴트 (누락 시 값 채움)
  const postId = post.id;
  const posterNickname = post.posterNickname ?? '작성자닉';
  const postTitle = post.title ?? '분실물 게시글 제목';
  const postImageUri = post.imageUri;
  const place = post.place ?? '장소 정보 없음';
  const purpose = post.purpose ?? 'lost';
  const authorId = post.authorId ?? 'author-xxx';
  const authorEmail = post.authorEmail ?? 'author@example.com';

  // ChatRoom에서 사용하는 규칙과 동일한 roomId 구성
  const roomId = `lost-${postId}-${posterNickname}`;

  /** 공통 파라미터 (OWNER/GUEST 둘 다 공유) */
  const baseParams = {
    source: 'lost' as const,
    roomId,
    postId,
    postTitle,
    postImageUri,
    posterNickname,
    place,
    purpose,                // 'lost' | 'found'
    authorId,
    authorEmail,
    initialLostStatus: 'OPEN' as const, // 처음엔 미해결로
    // initialMessage: 'DEV 모드로 진입했습니다.', // 필요시 사용
  };

  /** OWNER(작성자) 시나리오로 진입 */
  const openAsOwner = () => {
    navigation.navigate('ChatRoom', {
      ...baseParams,
      isOwner: true,         // ✅ ChatRoom의 usePermissions가 이 값으로 소유자 판정
    } as any);
  };

  /** GUEST(비작성자) 시나리오로 진입 */
  const openAsGuest = () => {
    navigation.navigate('ChatRoom', {
      ...baseParams,
      isOwner: false,        // ✅ 비소유자로 진입
    } as any);
  };

  return (
    <View style={styles.devBox}>
      <Text style={styles.devTitle}>DEV: 분실물 채팅 진입</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.owner]} onPress={openAsOwner} activeOpacity={0.85}>
          <Text style={styles.btnText}>작성자로 채팅보기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.guest]} onPress={openAsGuest} activeOpacity={0.85}>
          <Text style={styles.btnText}>게스트로 채팅보기</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        OWNER로 들어가면 채팅 상단에 <Text style={{ fontWeight: '700' }}>“마감 처리”</Text> 버튼이 노출됩니다.
      </Text>
    </View>
  );
}
