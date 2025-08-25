// pages/Market/MarketDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import ProfileRow from '../../components/Profile/ProfileRow'; // 분리한 프로필 컴포넌트
import { useLike } from '../../hooks/useLike';                 // 공통 좋아요 훅
import { updatePostLikeCountInList } from '../../repositories/marketRepo';
import type { RootStackScreenProps } from '../../types/navigation';
import { loadJson, saveJson } from '../../utils/storage';
import { useDeletePost } from '../../hooks/useDeletePost';     // 삭제 훅
import styles from './MarketDetailPage.styles';

const POSTS_KEY = 'market_posts_v1';
const LIKED_MAP_KEY = 'market_liked_map_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';
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

  // 오너 판별용
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

const coerceTrue = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
const sameId = (a?: string | number | null, b?: string | number | null) =>
  a != null && b != null && String(a) === String(b);
const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// 로그인 없어도 내 로컬 식별자 보장
async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const userEmail = (await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY)) ?? null;
  return { userId, userEmail };
}

export default function MarketDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'MarketDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<MarketPost | null>(null);
  const [index, setIndex] = useState(0);
  const [ownerMenuVisible, setOwnerMenuVisible] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const hScrollRef = useRef<ScrollView | null>(null);

  // 작성자 표시 (없으면 임시)
  const profileName = item?.authorName ?? '채희';
  const profileDept = item?.authorDept ?? 'AI학부';

  // 좋아요 훅
  const { liked, syncCount } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0, // 상세 로드 후 syncCount로 주입
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

  // ✅ 내 식별자 로드(보장)
  useEffect(() => {
    (async () => {
      try {
        const { userId, userEmail } = await ensureLocalIdentity();
        setMyId(userId);
        setMyEmail(userEmail);
      } catch (e) {
        console.log('load identity error', e);
      }
    })();
  }, []);

  // 게시글 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: MarketPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find(p => String(p.id) === String(id)) ?? null;
        if (!mounted) return;
        setItem(found);

        if (!found) {
          Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        // 상세의 likeCount를 훅과 동기화
        syncCount(found.likeCount ?? 0);
      } catch (e) {
        if (!mounted) return;
        console.log('detail load error', e);
        Alert.alert('오류', '게시글을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigation, syncCount]);

  // ✅ 오너 판별: 파라미터 or ID/이메일 비교
  const isOwner = useMemo(() => {
    const p = (route.params as any)?.isOwner;
    if (coerceTrue(p)) return true;
    if (sameId(item?.authorId, myId)) return true;
    if (sameEmail(item?.authorEmail ?? null, myEmail)) return true;
    return false;
  }, [route.params, item?.authorId, item?.authorEmail, myId, myEmail]);

  // (필요 시) 디버그
  useEffect(() => {
    console.log('🔎 [MARKET OWNER DEBUG]', {
      param_isOwner: (route.params as any)?.isOwner,
      myId,
      myEmail,
      item_authorId: item?.authorId,
      item_authorEmail: item?.authorEmail,
      result_isOwner: isOwner,
    });
  }, [isOwner, myId, myEmail, item?.authorId, item?.authorEmail, route.params]);

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

  // 신고 페이지로 이동 (탭)
  const onPressReport = () => {
    const targetLabel = `${profileDept} - ${profileName}`;
    navigation.navigate('Report', { targetLabel });
  };

  // 오너 메뉴 핸들러
  const openOwnerMenu = () => setOwnerMenuVisible(true);
  const closeOwnerMenu = () => setOwnerMenuVisible(false);
  const onOwnerEdit = () => {
    closeOwnerMenu();
    Alert.alert('알림', '수정 화면은 추후 연결 예정입니다.');
    // navigation.navigate('MarketEdit', { id }); // 추후 연결
  };
  const onOwnerDelete = async () => {
    closeOwnerMenu();
    await confirmAndDelete();
  };

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images =
    Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== 상단 이미지 영역 ===== */}
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
          >
            <Image source={require('../../assets/images/back_white.png')} style={styles.icon} />
          </TouchableOpacity>

          {/* 우상단: 신고(비소유) / 탭 아이콘(소유) */}
          {!isOwner ? (
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconRightTop]}
              onPress={onPressReport}
              accessibilityRole="button"
              accessibilityLabel="신고하기"
              activeOpacity={0.9}
            >
              <Image source={require('../../assets/images/alert_white.png')} style={styles.icon} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconRightTop]}
              onPress={openOwnerMenu}
              accessibilityRole="button"
              accessibilityLabel="게시글 옵션"
              activeOpacity={0.9}
            >
              <Image source={require('../../assets/images/tab.png')} style={styles.icon} />
            </TouchableOpacity>
          )}

          {/* 우하단: 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>

          {/* ✅ 소유자 옵션 모달 */}
          {isOwner && ownerMenuVisible && (
            <>
              {/* Dim */}
              <TouchableOpacity
                style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
                activeOpacity={1}
                onPress={closeOwnerMenu}
              />
              {/* 메뉴 카드 */}
              <View
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 55 + 28,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  paddingVertical: 6,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                  zIndex: 20,
                }}
              >
                <TouchableOpacity
                  onPress={onOwnerEdit}
                  style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 14, color: '#1E1E1E' }}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onOwnerDelete}
                  style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 14, color: '#D32F2F', fontWeight: '700' }}>삭제</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
      <DetailBottomBar
        variant="detail"
        initialLiked={liked}
        onToggleLike={async (likedFlag) => {
          // 로컬 liked 맵 갱신
          const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
          likedMap[id] = likedFlag;
          await saveJson(LIKED_MAP_KEY, likedMap);

          // likeCount 즉시 반영 + 목록 동기화
          setItem((prev) => {
            if (!prev) return prev;
            const nextCount = Math.max(
              0,
              (prev.likeCount ?? 0) + (likedFlag ? 1 : -1)
            );
            updatePostLikeCountInList(POSTS_KEY, prev.id, nextCount);
            return { ...prev, likeCount: nextCount };
          });
        }}
        chatAutoNavigateParams={{
          postId: item.id,
          sellerNickname: profileName,
          productTitle: item.title,
          productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
          productImageUri: images[0],
        }}
      />
    </View>
  );
}
