// /components/Chat/ChatHeader/ChatHeader.tsx

import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './ChatHeader.styles';

const backIcon = require('@/assets/images/back.png');
const moreIcon = require('@/assets/images/more.png');

// 게시글 출처 타입
export type ChatSource = 'market' | 'lost' | 'group';

// 헤더 하단에 노출될 게시글 메타
export type PostMeta = {
  source: ChatSource;     // 'market' | 'lost' | 'group' (group = 공동구매)
  postId: string;         // 상세 페이지로 보낼 실제 ID
  title?: string;
  thumbnailUri?: string;

  priceLabel?: string;              // market 전용 (예: "₩ 30,000" 또는 "나눔")
  purpose?: 'lost' | 'found';       // lost 전용 (배지: 분실/습득)
  placeLabel?: string;              // lost 전용 (장소)
  recruitLabel?: string;            // group 전용 (모집 인원/상태)
};

type Props = {
  /** 중앙 타이틀(상대 닉네임 등) */
  title: string;
  /** 뒤로가기 동작 */
  onPressBack: () => void;
  /** 더보기 동작(신고/차단 모달 오픈 등) */
  onPressMore?: () => void;

  /** 헤더 하단에 표시할 "게시글 카드" 메타 (없으면 카드 미노출) */
  post?: PostMeta;

  /**
   * 게시글 존재 여부 외부 검사 함수
   * - true → 상세로 이동
   * - false → '삭제된 게시글' Alert
   */
  checkPostExistsExternally?: (meta: PostMeta) => Promise<boolean>;
};

/** 내부 기본 존재여부 체크 (임시: 존재한다고 가정) */
async function defaultCheckPostExists(_: PostMeta): Promise<boolean> {
  // TODO: 필요 시 스토리지/네트워크(API) 연동
  return true;
}

export default function ChatHeader({
  title,
  onPressBack,
  onPressMore,
  post,
  checkPostExistsExternally,
}: Props) {
  // 🔧 ParamListBase로 느슨하게 잡아 라우트 타입 충돌 제거
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  /** 라우트 이름/파라미터 키 매핑
   * - 보통 상세 라우트가 { id: string } 형태이므로 paramKey는 'id'로 통일
   */
  const routeBySource: Record<PostMeta['source'], { name: string; paramKey: 'id' }> = {
    market: { name: 'MarketDetail',   paramKey: 'id' },
    lost:   { name: 'LostDetail',     paramKey: 'id' },
    group:  { name: 'GroupBuyDetail', paramKey: 'id' },
  };

  /** 카드 탭 → 상세 이동 or 삭제 안내 */
  const handlePressPost = useCallback(async () => {
    if (!post) return;

    // 1) 존재여부 검사 (외부 주입 우선, 예외 발생 시 false 처리)
    const exists = await (async () => {
      try {
        if (checkPostExistsExternally) {
          return await checkPostExistsExternally(post);
        }
        return await defaultCheckPostExists(post);
      } catch {
        return false;
      }
    })();

    if (!exists) {
      Alert.alert('삭제된 게시글', '해당 게시글은 삭제되었거나 더 이상 볼 수 없어요.', [
        { text: '확인' },
      ]);
      return;
    }

    // 2) 출처별 상세 라우트로 이동
    const conf = routeBySource[post.source];
    if (!conf?.name) {
      Alert.alert('알림', '알 수 없는 게시글 유형입니다.');
      return;
    }
    navigation.navigate(conf.name, { [conf.paramKey]: post.postId });
  }, [navigation, post, checkPostExistsExternally]);

  // lost 배지 텍스트
  const purposeBadgeText =
    post?.purpose === 'lost' ? '분실' : post?.purpose === 'found' ? '습득' : undefined;

  return (
    <View style={styles.wrap}>
      {/* ===== 상단 헤더 바 ===== */}
      <View style={styles.header}>
        {/* 좌측: 뒤로가기 */}
        <TouchableOpacity
          onPress={onPressBack}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={backIcon} style={styles.icon} />
        </TouchableOpacity>

        {/* 중앙: 타이틀 */}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>

        {/* 우측: 더보기 */}
        <TouchableOpacity
          onPress={onPressMore}
          style={styles.moreBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={moreIcon} style={styles.icon_more} />
        </TouchableOpacity>
      </View>

      {/* ===== 헤더 하단: 게시글 요약 카드 ===== */}
      {post && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePressPost}
          style={styles.postCard}
        >
          {/* 썸네일 */}
          <View style={styles.thumbWrap}>
            {post.thumbnailUri ? (
              <Image
                source={{ uri: post.thumbnailUri }}
                style={styles.thumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
          </View>

          {/* 텍스트 메타 */}
          <View style={styles.meta}>
            {/* 제목 */}
            <Text style={styles.postTitle} numberOfLines={1}>
              {post.title ?? '제목 없음'}
            </Text>

            {/* 시장/분실/공구 별 보조 정보 */}
            {post.source === 'market' && (
              <Text style={styles.price}>
                {post.priceLabel && post.priceLabel.trim().length > 0 ? post.priceLabel : '₩ 0'}
              </Text>
            )}

            {post.source === 'lost' && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {purposeBadgeText && (
                  <View
                    style={[
                      styles.badgeBase,
                      post.purpose === 'lost' ? styles.badgeLost : styles.badgeFound,
                    ]}
                  >
                    <Text style={styles.badgeText}>{purposeBadgeText}</Text>
                  </View>
                )}
                {!!post.placeLabel && (
                  <Text style={styles.placeText} numberOfLines={1}>
                    {post.placeLabel}
                  </Text>
                )}
              </View>
            )}

            {post.source === 'group' && !!post.recruitLabel && (
              <Text style={styles.groupBuyLabel} numberOfLines={1}>
                {post.recruitLabel}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
``
