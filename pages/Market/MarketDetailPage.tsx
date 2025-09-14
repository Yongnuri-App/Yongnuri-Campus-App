// pages/Market/MarketDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';
import ProfileRow from '../../components/Profile/ProfileRow';
import { useDeletePost } from '../../hooks/useDeletePost';
import { useLike } from '../../hooks/useLike';
import usePermissions from '../../hooks/usePermissions';
import AdminActionSheet from '../../components/Modals/AdminActionSheet/AdminActionSheet';
import { updatePostLikeCountInList } from '../../repositories/marketRepo';
import type { RootStackScreenProps } from '../../types/navigation';
import { loadJson, saveJson } from '../../utils/storage';
import styles from './MarketDetailPage.styles';

const POSTS_KEY = 'market_posts_v1';
const LIKED_MAP_KEY = 'market_liked_map_v1';
const SCREEN_WIDTH = Dimensions.get('window').width;

type MarketPost = {
  id: string;
  title: string;
  description: string;
  mode: 'sell' | 'donate';
  price: number;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function MarketDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'MarketDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<MarketPost | null>(null);
  const [index, setIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const hScrollRef = useRef<ScrollView | null>(null);

  // 좋아요 훅
  const { liked, syncCount } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
  });

  // 삭제 훅
  const { confirmAndDelete } = useDeletePost({
    postId: id,
    postsKey: POSTS_KEY,
    likedMapKey: LIKED_MAP_KEY,
    navigation,
    confirmTitle: '삭제',
    confirmMessage: '정말로 이 게시글을 삭제할까요?',
    confirmOkText: '삭제',
    confirmCancelText: '취소',
  });

  /** 상세 로드 */
  const loadItem = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list: MarketPost[] = raw ? JSON.parse(raw) : [];
      const found = list.find(p => String(p.id) === String(id)) ?? null;

      setItem(found);
      if (!found) {
        Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      syncCount(found.likeCount ?? 0);
    } catch (e) {
      console.log('market detail load error', e);
      Alert.alert('오류', '게시글을 불러오지 못했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    }
  }, [id, navigation, syncCount]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => loadItem());
    return unsub;
  }, [navigation, loadItem]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  /** 권한 파생: 관리자/소유자 (관리자 우선 정책은 모달에서 showEdit로 처리) */
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  /** 표시용 프로필 */
  const profileName = item?.authorName ?? '채희';
  const profileDept = item?.authorDept ?? 'AI학부';

  const priceDisplay = useMemo(() => {
    if (!item) return '';
    return item.mode === 'donate'
      ? '나눔'
      : `₩ ${Number(item.price ?? 0).toLocaleString('ko-KR')}`;
  }, [item]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  const onPressReport = () => {
    const targetLabel = `${profileDept} - ${profileName}`;
    navigation.navigate('Report', { targetLabel });
  };

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  /** 우상단 버튼: 관리자/소유자 ⇒ 옵션(모달), 일반 ⇒ 신고 */
  const RightTopButton = () => {
    if (isAdmin || isOwner) {
      return (
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconRightTop]}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="게시글 옵션"
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image source={require('../../assets/images/tab.png')} style={styles.icon} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconRightTop]}
        onPress={onPressReport}
        accessibilityRole="button"
        accessibilityLabel="신고하기"
        activeOpacity={0.9}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image source={require('../../assets/images/alert_white.png')} style={styles.icon} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== 상단 이미지 ===== */}
        <View style={styles.imageArea}>
          {images.length > 0 ? (
            <ScrollView
              ref={hScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumEnd}
              contentOffset={{ x: 0, y: 0 }}
            >
              {images.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.mainImage} />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>이미지 없음</Text>
            </View>
          )}

          {/* 좌상단: 뒤로가기 */}
          <TouchableOpacity
            style={[styles.iconBtn, styles.iconLeftTop]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            activeOpacity={0.9}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={require('../../assets/images/back_white.png')} style={styles.icon} />
          </TouchableOpacity>

          {/* 우상단: 역할별 버튼 */}
          <RightTopButton />

          {/* 우하단: 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {/* ===== 본문 ===== */}
        <View style={styles.body}>
          <ProfileRow name={profileName} dept={profileDept} />

          <View style={styles.divider} />

          {/* 제목/가격/시간 */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>{priceDisplay}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>

          {/* 설명 */}
          <Text style={styles.desc}>{item.description}</Text>

          {/* 거래 희망 장소 */}
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>거래 희망 장소</Text>
            <Text style={styles.locationValue}>{item.location}</Text>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ===== 하단 고정 바 ===== */}
      {!isOwner && (
        <DetailBottomBar
          variant="detail"
          initialLiked={liked}
          onToggleLike={async (likedFlag) => {
            const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
            likedMap[id] = likedFlag;
            await saveJson(LIKED_MAP_KEY, likedMap);

            setItem((prev) => {
              if (!prev) return prev;
              const nextCount = Math.max(0, (prev.likeCount ?? 0) + (likedFlag ? 1 : -1));
              updatePostLikeCountInList(POSTS_KEY, prev.id, nextCount);
              return { ...prev, likeCount: nextCount };
            });
          }}
          chatAutoNavigateParams={{
            source: 'market',
            postId: String(item.id),
            sellerNickname: profileName ?? '판매자',
            productTitle: item.title,
            productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
            productImageUri: Array.isArray(images) && images.length > 0 ? images[0] : undefined,
          }}
        />
      )}

      {/* ✅ 관리자/판매자 공통 옵션 모달
          - 관리자: 삭제만 (showEdit=false)
          - 판매자: 수정+삭제 (showEdit=true)
          - 관리자이면서 판매자여도 정책상 삭제만을 강제 → showEdit={!isAdmin && isOwner}
      */}
      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner}
          onEdit={() => navigation.navigate('SellItem', { mode: 'edit', id })}
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
