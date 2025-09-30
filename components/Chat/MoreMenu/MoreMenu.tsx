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
  const kind: 'market' | 'lost' | 'groupbuy' =
    srcRaw === 'market' ? 'market' : srcRaw === 'lost' ? 'lost' : 'groupbuy';

  // 2) 게시글 id/title/storageKey
  const postId =
    (raw?.postId && String(raw.postId)) ||
    (raw?.id && String(raw.id)) ||
    (raw?.post_id && String(raw.post_id)) ||
    (raw?.origin?.params?.postId && String(raw.origin.params.postId)) ||
    (raw?.origin?.params?.id && String(raw.origin.params.id)) ||
    undefined;

  const postTitle =
    kind === 'market' ? s(raw?.productTitle) : s(raw?.postTitle) || s(raw?.title);

  const storageKeyByKind: Record<typeof kind, string> = {
    market: 'market_posts_v1',
    lost: 'lost_found_posts_v1',
    groupbuy: 'groupbuy_posts_v1',
  };

  // 3) 대상 사용자 정보(닉네임/학과/이메일 등)
  //    - 채팅방 라우트에서 흔히 쓰는 키들을 폭넓게 커버
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

  // 4) Report 페이지에 넘길 최종 파라미터(ReportPage.tsx의 route.params와 호환)
  const params = {
    mode: 'compose' as const,
    // 표시 라벨(닉네임/학과 조합은 ReportPage에서 한 번 더 정리되므로 여기선 raw만 전달)
    targetNickname,
    targetDept,
    targetEmail: targetEmail || null,
    // 승인 처리 시 삭제/문구에 사용
    targetPostId: postId,
    targetStorageKey: storageKeyByKind[kind],
    targetPostTitle: postTitle,
    targetKind: kind,
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
    const reportParams = buildReportParamsFromRouteParams(raw);

    // 모달 먼저 닫기
    onClose?.();

    // 필요한 경우 기존 onReport를 호출하고 싶다면 주석 해제
    // onReport?.();

    // 'Report' 스크린으로 이동 (프로젝트 라우트 이름이 다르면 여기만 변경)
    navigation.navigate('Report', reportParams);
  }, [navigation, onClose, raw /* onReport */]);

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
