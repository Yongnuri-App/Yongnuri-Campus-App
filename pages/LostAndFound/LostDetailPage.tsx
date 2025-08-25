// pages/LostAndFound/LostDetailPage.tsx
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
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './LostDetailPage.styles';
import { useLike } from '../../hooks/useLike';
import ProfileRow from '../../components/Profile/ProfileRow';
import { useDeletePost } from '../../hooks/useDeletePost';

const POSTS_KEY = 'lost_found_posts_v1';
const LIKED_MAP_KEY = 'lost_found_liked_map_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';
const SCREEN_WIDTH = Dimensions.get('window').width;

type LostPost = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO

  // ✅ 오너 판별용
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

async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const userEmail = (await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY)) ?? null;
  return { userId, userEmail };
}

export default function LostDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'LostDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<LostPost | null>(null);
  const [index, setIndex] = useState(0);
  const [ownerMenuVisible, setOwnerMenuVisible] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const hScrollRef = useRef<ScrollView | null>(null);

  // 좋아요 훅
  const { liked, syncCount, setLikedPersisted } = useLike({
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

  // ✅ 내 식별자 로드(보장)
  useEffect(() => {
    (async () => {
      try {
        const { userId, userEmail } = await ensureLocalIdentity();
        setMyId(userId);
        setMyEmail(userEmail);
      } catch (e) {
        console.log('lost: load identity error', e);
      }
    })();
  }, []);

  // 상세 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: LostPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find(p => String(p.id) === String(id)) ?? null;
        if (!mounted) return;
        setItem(found);

        if (!found) {
          Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }
        syncCount(found.likeCount ?? 0);
      } catch (e) {
        if (!mounted) return;
        console.log('lost detail load error', e);
        Alert.alert('오류', '게시글을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigation, syncCount]);

  // ✅ 오너 판별: (선택) 파라미터 + ID/이메일 비교
  const isOwner = useMemo(() => {
    const p = (route.params as any)?.isOwner;
    if (coerceTrue(p)) return true;
    if (sameId(item?.authorId, myId)) return true;
    if (sameEmail(item?.authorEmail ?? null, myEmail)) return true;
    return false;
  }, [route.params, item?.authorId, item?.authorEmail, myId, myEmail]);

  // 디버그(필요시 콘솔 확인)
  useEffect(() => {
    console.log('🔎 [LOST OWNER DEBUG]', {
      param_isOwner: (route.params as any)?.isOwner,
      myId, myEmail,
      item_authorId: item?.authorId,
      item_authorEmail: item?.authorEmail,
      result_isOwner: isOwner,
    });
  }, [isOwner, myId, myEmail, item?.authorId, item?.authorEmail, route.params]);

  // 뱃지 라벨
  const badgeLabel = useMemo(() => (item?.type === 'lost' ? '분실' : '습득'), [item]);
  const isLost = item?.type === 'lost';

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  // 신고 페이지 이동
  const onPressReport = () => {
    const targetLabel = `${item?.authorDept ?? 'AI학부'} - ${item?.authorName ?? '채히'}`;
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

  // 오너 메뉴
  const openOwnerMenu = () => setOwnerMenuVisible(true);
  const closeOwnerMenu = () => setOwnerMenuVisible(false);
  const onOwnerEdit = () => {
    closeOwnerMenu();
    Alert.alert('알림', '수정 화면은 추후 연결 예정입니다.');
  };
  const onOwnerDelete = async () => {
    closeOwnerMenu();
    await confirmAndDelete();
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

          {/* 우하단: "1 / N" 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>

          {/* ✅ 소유자 옵션 모달 */}
          {isOwner && ownerMenuVisible && (
            <>
              <TouchableOpacity
                style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
                activeOpacity={1}
                onPress={closeOwnerMenu}
              />
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
          <ProfileRow name={item?.authorName ?? '채히'} dept={item?.authorDept ?? 'AI학부'} />

          <View style={styles.divider} />

          {/* 뱃지 + 제목 */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isLost ? styles.badgeLost : styles.badgeFound]}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </View>

          {/* 시간 */}
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>

          {/* 설명 */}
          <Text style={styles.desc}>{item.content}</Text>

          {/* 분실/습득 장소 */}
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>분실/습득 장소</Text>
            <Text style={styles.locationValue}>{item.location}</Text>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ===== 하단 고정 바 (좋아요/메시지) ===== */}
      <DetailBottomBar
        initialLiked={liked}
        onToggleLike={async (nextLiked: boolean) => {
          await setLikedPersisted(nextLiked);
          setItem(prev => {
            if (!prev) return prev;
            const nextCount = Math.max(0, (prev.likeCount ?? 0) + (nextLiked ? 1 : -1));
            return { ...prev, likeCount: nextCount };
          });
        }}
        onPressSend={(msg: string) => {
          Alert.alert('전송', `메시지: ${msg}`);
        }}
      />
    </View>
  );
}
