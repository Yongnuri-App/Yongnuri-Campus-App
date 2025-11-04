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
  source: ChatSource;
  postId: string;
  title?: string;
  thumbnailUri?: string;
  priceLabel?: string;            // market
  purpose?: 'lost' | 'found';     // lost
  placeLabel?: string;            // lost
  recruitLabel?: string;          // group
};

type Props = {
  title: string;
  onPressBack: () => void;
  onPressMore?: () => void;
  post?: PostMeta;
  checkPostExistsExternally?: (meta: PostMeta) => Promise<boolean>;
};

/** ✅ 컴포넌트 바깥(모듈 스코프)으로 이동: 안정 상수 */
const ROUTE_BY_SOURCE: Record<PostMeta['source'], { name: string; paramKey: 'id' }> = {
  market: { name: 'MarketDetail', paramKey: 'id' },
  lost:   { name: 'LostDetail',   paramKey: 'id' },
  group:  { name: 'GroupBuyDetail', paramKey: 'id' },
};

/** 내부 기본 존재여부 체크 (임시) */
async function defaultCheckPostExists(_: PostMeta): Promise<boolean> {
  return true;
}

export default function ChatHeader({
  title,
  onPressBack,
  onPressMore,
  post,
  checkPostExistsExternally,
}: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  /** 카드 탭 → 상세 이동 or 삭제 안내 */
  const handlePressPost = useCallback(async () => {
    if (!post) return;

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
      Alert.alert('삭제된 게시글', '해당 게시글은 삭제되었거나 더 이상 볼 수 없어요.', [{ text: '확인' }]);
      return;
    }

    const conf = ROUTE_BY_SOURCE[post.source]; // ✅ 모듈 상수 사용
    if (!conf?.name) {
      Alert.alert('알림', '알 수 없는 게시글 유형입니다.');
      return;
    }
    navigation.navigate(conf.name, { [conf.paramKey]: post.postId });
  }, [navigation, post, checkPostExistsExternally]); // ✅ routeBySource 제거

  const purposeBadgeText =
    post?.purpose === 'lost' ? '분실' : post?.purpose === 'found' ? '습득' : undefined;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPressBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Image source={backIcon} style={styles.icon} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

        <TouchableOpacity onPress={onPressMore} style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Image source={moreIcon} style={styles.icon_more} />
        </TouchableOpacity>
      </View>

      {post && (
        <TouchableOpacity activeOpacity={0.9} onPress={handlePressPost} style={styles.postCard}>
          <View style={styles.thumbWrap}>
            {post.thumbnailUri
              ? <Image source={{ uri: post.thumbnailUri }} style={styles.thumb} resizeMode="cover" />
              : <View style={[styles.thumb, styles.thumbPlaceholder]} />}
          </View>

          <View style={styles.meta}>
            <Text style={styles.postTitle} numberOfLines={1}>{post.title ?? '제목 없음'}</Text>

            {post.source === 'market' && (
              <Text style={styles.price}>{post.priceLabel?.trim()?.length ? post.priceLabel : '₩ 0'}</Text>
            )}

            {post.source === 'lost' && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {purposeBadgeText && (
                  <View style={[styles.badgeBase, post.purpose === 'lost' ? styles.badgeLost : styles.badgeFound]}>
                    <Text style={styles.badgeText}>{purposeBadgeText}</Text>
                  </View>
                )}
                {!!post.placeLabel && (
                  <Text style={styles.placeText} numberOfLines={1}>{post.placeLabel}</Text>
                )}
              </View>
            )}

            {post.source === 'group' && !!post.recruitLabel && (
              <Text style={styles.groupBuyLabel} numberOfLines={1}>{post.recruitLabel}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
