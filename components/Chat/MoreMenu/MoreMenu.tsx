import { useNavigation, useRoute, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from './MoreMenu.styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onReport: () => void; // 기존 시그니처는 유지(호환). 내부에서 네비게이션 처리하므로 굳이 호출하진 않음.
  onBlock: () => void;
};

const ALERT_ICON = require('../../../assets/images/alert_red.png');
const BLOCK_ICON = require('../../../assets/images/block.png');

/** 안전 문자열 헬퍼 */
const s = (v: any) => (v == null ? '' : String(v)).trim();

/** route.params에서 신고에 필요한 기본 파라미터를 최대한 뽑아 Report 페이지로 전달 */
function buildReportParamsFromRouteParams(raw: any) {
  // 1) 소스 판별
  const srcRaw =
    raw?.source ??
    raw?.category ??
    raw?.origin?.source ??
    raw?.origin?.params?.source;

  // 우리 프로젝트에서 쓰는 kind 키로 통일
  const kind: 'market' | 'lost' | 'groupbuy' | 'chat' =
    srcRaw === 'market' ? 'market'
    : srcRaw === 'lost' ? 'lost'
    : srcRaw === 'chat' ? 'chat'
    : 'groupbuy';

  // 2) 게시글 id/title/storageKey (chat은 불필요하지만 일관성 유지)
  const postId =
    (raw?.postId && String(raw.postId)) ||
    (raw?.id && String(raw.id)) ||
    (raw?.post_id && String(raw.post_id)) ||
    (raw?.origin?.params?.postId && String(raw.origin.params.postId)) ||
    (raw?.origin?.params?.id && String(raw.origin.params.id)) ||
    undefined;

  const postTitle =
    kind === 'market' ? s(raw?.productTitle)
    : kind === 'chat' ? undefined  // ✅ 채팅은 게시글 제목 없음
    : s(raw?.postTitle) || s(raw?.title);

  const storageKeyByKind: Record<typeof kind, string> = {
    market: 'market_posts_v1',
    lost: 'lost_found_posts_v1',
    groupbuy: 'groupbuy_posts_v1',
    chat: '',  // ✅ 채팅은 storageKey 불필요
  };

  // 3) 대상 사용자 정보(닉네임/학과/이메일 등)
  const targetNickname =
    s(raw?.opponentNickname) ||
    s(raw?.nickname) ||
    s(raw?.buyerNickname) ||
    s(raw?.sellerNickname) ||
    s(raw?.posterNickname) ||
    s(raw?.authorNickname) ||
    s(raw?.writerNickname) ||
    undefined;

  const targetDept = s(raw?.opponentDept) || s(raw?.department) || undefined;

  const targetEmail =
    s(raw?.opponentEmail) ||
    s(raw?.buyerEmail) ||
    s(raw?.sellerEmail) ||
    s(raw?.authorEmail) ||
    undefined;

  // ✅ 4) targetUserId 추출 (채팅 신고에 필수)
  const targetUserId =
    raw?.opponentId ??
    raw?.buyerId ??
    raw?.sellerId ??
    raw?.authorId ??
    undefined;

  // 5) Report 페이지에 넘길 최종 파라미터
  const params = {
    mode: 'compose' as const,
    targetNickname,
    targetDept,
    targetEmail: targetEmail || undefined,  // ✅ null 대신 undefined
    targetPostId: postId,
    targetStorageKey: storageKeyByKind[kind],
    targetPostTitle: postTitle,
    targetKind: kind,
    targetUserId,  // ✅ 추가
  };

  return params;
}

export default function MoreMenu({ visible, onClose, onReport, onBlock }: Props) {
  // 현재 스택에서 내비/라우트 사용
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<any>();
  const raw = (route?.params ?? {}) as any;

  /** 신고 버튼 눌렀을 때: 모달 닫고 → Report 페이지로 이동 */
  const handlePressReport = useCallback(() => {
    onClose?.();
    onReport?.();  // ✅ 부모 컴포넌트의 핸들러 호출
  }, [onClose, onReport]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 배경 터치 시 닫힘 */}
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        {/* 메뉴 박스 영역(눌러도 닫히지 않도록 내부는 TouchableOpacity로 처리) */}
        <View style={styles.menuBox}>
          {/* 신고하기 */}
          <TouchableOpacity style={styles.menuItem} onPress={handlePressReport} activeOpacity={0.85}>
            <View style={styles.menuItemRow}>
              <Image source={ALERT_ICON} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>신고하기</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 차단하기 */}
          <TouchableOpacity style={styles.menuItem} onPress={onBlock} activeOpacity={0.85}>
            <View style={styles.menuItemRow}>
              <Image source={BLOCK_ICON} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>차단하기</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
