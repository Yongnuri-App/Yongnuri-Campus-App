// pages/Market/MarketDetailPage.tsx
import DetailBottomBar from '@/components/Bottom/DetailBottomBar';
import AdminActionSheet from '@/components/Modals/AdminActionSheet/AdminActionSheet';
import ProfileRow from '@/components/Profile/ProfileRow';
import { useDeletePost } from '@/hooks/useDeletePost';
import { useLike } from '@/hooks/useLike';
import usePermissions from '@/hooks/usePermissions';
import { updatePostLikeCountInList } from '@/repositories/marketRepo';
import { upsertRoomOnOpen } from '@/storage/chatStore';
import type { ChatCategory } from '@/types/chat';
import type { RootStackScreenProps } from '@/types/navigation';
import { getProfileByEmail, toDisplayName } from '@/utils/session';
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
import styles from './MarketDetailPage.styles';

/** AsyncStorage 키 상수 */
const POSTS_KEY = 'market_posts_v1';
const LIKED_MAP_KEY = 'market_liked_map_v1';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** 마켓 게시글 타입 */
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

  /** 작성자 메타 */
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;

  /** (선택) 판매 상태 */
  status?: 'ON_SALE' | 'RESERVED' | 'SOLD';
};

/** "n분 전" 표기 */
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

  /** 좋아요 훅 (✅ 유저별 liked_map 키 사용) */
  const { liked, syncCount, setLikedPersisted } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
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
      // 좋아요 카운트 동기화
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

  /** 삭제 훅 */
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

  /** 권한 파생 */
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  /** 닉네임/학과 표시 상태 */
  const [authorNickname, setAuthorNickname] = useState<string>('익명');
  const [authorDeptLabel, setAuthorDeptLabel] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!item) return;

      if (item.authorEmail) {
        try {
          const prof = await getProfileByEmail(item.authorEmail);
          if (prof) {
            const nick =
              toDisplayName({ name: prof.name, nickname: prof.nickname }, true) ||
              item.authorName ||
              '익명';
            setAuthorNickname(nick);
            setAuthorDeptLabel(prof.department || item.authorDept || '');
            return;
          }
        } catch (e) {
          console.log('profile lookup failed:', e);
        }
      }

      const nick = item.authorName || '익명';
      setAuthorNickname(nick);
      setAuthorDeptLabel(item.authorDept || '');
    })();
  }, [item]);

  /** 가격 표기 */
  const priceDisplay = useMemo(() => {
    if (!item) return '';
    return item.mode === 'donate'
      ? '나눔'
      : `₩ ${Number(item.price ?? 0).toLocaleString('ko-KR')}`;
  }, [item]);

  /** 이미지 인덱스 업데이트 */
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고 화면으로 이동 */
  const onPressReport = React.useCallback(() => {
    if (!item) return;

    navigation.navigate('Report', {
      mode: 'compose',
      targetNickname: authorNickname,
      targetDept: authorDeptLabel || undefined,
      targetEmail: item.authorEmail ?? null,

      // 삭제/알림용 메타
      targetPostId: String(item.id),
      targetStorageKey: POSTS_KEY,   // 'market_posts_v1'
      targetPostTitle: item.title,
      targetKind: 'market',
    });
  }, [item, navigation, authorNickname, authorDeptLabel]);

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  /** 우상단 버튼 */
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
          <Image source={require('@/assets/images/more_white.png')} style={styles.icon} />
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
        <Image source={require('@/assets/images/alert_white.png')} style={styles.icon} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ===== 상단 이미지 영역 ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
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
            <Image source={require('@/assets/images/back_white.png')} style={styles.icon} />
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
          {/* 이메일 기반 최신 프로필 표시 + 폴백 */}
          <ProfileRow
            emailForLookup={item.authorEmail ?? null}
            preferNickname
            fallbackName={authorNickname}
            fallbackDept={authorDeptLabel || ' '}
          />

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

      {/* DEV: 판매자 강제 채팅 진입 버튼 (__DEV__에서만 노출) */}
      {__DEV__ && isOwner && (
        <TouchableOpacity
          style={styles.devOpenChatBtn}
          onPress={async () => {
            const category: ChatCategory = 'market';
            const nickname = authorNickname;
            const roomId = `market-${String(item.id)}-${nickname}`;
            const productTitle = item.title;
            const productPrice = item.mode === 'donate' ? 0 : Number(item.price ?? 0);
            const productImageUri =
              Array.isArray(images) && images.length > 0 ? images[0] : undefined;

            const preview = 'DEV: 판매자 진입 테스트';
            await upsertRoomOnOpen({
              roomId,
              category,
              nickname,
              productTitle,
              productPrice,
              productImageUri,
              preview,
              origin: {
                source: 'market',
                params: {
                  source: 'market',
                  postId: String(item.id),
                  sellerNickname: nickname,
                  // @ts-expect-error legacy compat
                  nickname,
                  productTitle,
                  productPrice,
                  productImageUri,
                  authorId: item.authorId,
                  authorEmail: item.authorEmail ?? null,
                  initialSaleStatus: item.status ?? 'ON_SALE',
                  initialMessage: preview,
                },
              },
            });

            navigation.navigate('ChatRoom', {
              source: 'market',
              postId: String(item.id),
              sellerNickname: nickname,
              // @ts-expect-error legacy compat
              nickname,
              productTitle,
              productPrice,
              productImageUri,
              authorId: item.authorId,
              authorEmail: item.authorEmail ?? null,
              initialSaleStatus: item.status ?? 'ON_SALE',
              initialMessage: preview,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="DEV: 채팅 열기(판매자)"
          activeOpacity={0.9}
        >
          <Text style={styles.devOpenChatText}>DEV: 채팅 열기(판매자)</Text>
        </TouchableOpacity>
      )}

      {/* ===== 하단 고정 바 ===== */}
      {!isOwner && (
        <DetailBottomBar
          variant="detail"
          initialLiked={liked}
          onToggleLike={async (nextLiked) => {
            // ✅ 유저별 liked_map 키에 저장 + 전역 리스트 카운트 동기화
            await setLikedPersisted(nextLiked);
            setItem((prev) => {
              if (!prev) return prev;
              const nextCount = Math.max(0, (prev.likeCount ?? 0) + (nextLiked ? 1 : -1));
              updatePostLikeCountInList(POSTS_KEY, prev.id, nextCount);
              return { ...prev, likeCount: nextCount };
            });
          }}
          chatAutoNavigateParams={{
            source: 'market',
            postId: String(item.id),
            sellerNickname: authorNickname,
            // @ts-expect-error legacy compat
            nickname: authorNickname,
            productTitle: item.title,
            productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
            productImageUri: Array.isArray(images) && images.length > 0 ? images[0] : undefined,
            authorId: item.authorId,
            authorEmail: item.authorEmail ?? null,
            initialSaleStatus: item.status ?? 'ON_SALE',
          }}
        />
      )}

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
