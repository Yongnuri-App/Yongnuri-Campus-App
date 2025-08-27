// pages/LostAndFound/LostDetailPage.tsx
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
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './LostDetailPage.styles';

/** ===================== 로컬 스토리지 키/상수 ===================== */
const POSTS_KEY = 'lost_found_posts_v1';
const LIKED_MAP_KEY = 'lost_found_liked_map_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

/** 팀/프로젝트마다 다를 수 있어 여러 후보를 조회합니다. */
const PROFILE_KEYS_CANDIDATES = [
  'profiles_map_v1',      // 우리가 제안했던 기본 키
  'user_profiles_v1',     // 다른 화면(중고거래)에서 쓰는 키일 수 있음
  'members_profile_map',  // 예비 후보
];

/** ✅ API 연결 전 임시 폴백 닉네임 */
const DISPLAY_NAME_FALLBACK = '채히';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** ===================== 타입 ===================== */
type LostPost = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;
};

type UserProfile = {
  userId: string | number;
  email?: string | null;
  name?: string | null;      // 실명
  nickname?: string | null;  // 화면 표시용(우선 사용)
  dept?: string | null;
  avatarUrl?: string | null;
};

/** ===================== 유틸 함수 ===================== */
/** "방금 전 / N분 전 / N시간 전 / N일 전" */
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

/** 현재 기기 로컬 사용자 식별자 확보(없으면 생성) */
async function ensureLocalIdentity() {
  let userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  if (!userId) {
    userId = `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  const userEmail = (await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY)) ?? null;
  return { userId, userEmail };
}

/** email에서 닉네임 유사값 추출(a@b.com → a) */
const nicknameFromEmail = (email?: string | null) =>
  email && email.includes('@') ? email.split('@')[0] : null;

/**
 * 작성자의 '표시 이름'을 가능한 많은 경로에서 찾아 반환
 * 1) post.authorName
 * 2) 프로필 맵들(PROFILE_KEYS_CANDIDATES)에서 authorId → nickname > name
 *    또는 email → nickname > name
 * 3) 같은 작성자의 다른 글에서 authorName
 * 4) authorEmail 로컬파트
 * 5) '익명'
 */
async function resolveAuthorDisplayName(post: LostPost): Promise<string> {
  // 1) 글에 이미 이름이 있으면 바로 사용
  if (post.authorName && post.authorName.trim()) return post.authorName.trim();

  // 2) 여러 후보 키의 프로필 맵에서 찾아보기
  try {
    for (const key of PROFILE_KEYS_CANDIDATES) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;

      const map: Record<string, UserProfile> | UserProfile[] = JSON.parse(raw);

      // a) 객체 맵 형태 { [id]: profile }
      if (!Array.isArray(map)) {
        // id로 조회
        if (post.authorId != null && (map as Record<string, UserProfile>)[String(post.authorId)]) {
          const p = (map as Record<string, UserProfile>)[String(post.authorId)];
          const name = p?.nickname ?? p?.name;
          if (name) return name;
        }
        // email로 선형 탐색
        if (post.authorEmail) {
          const p = Object.values(map as Record<string, UserProfile>).find(
            (v) =>
              v?.email &&
              v.email.toLowerCase() === (post.authorEmail as string).toLowerCase()
          );
          const name = p?.nickname ?? p?.name;
          if (name) return name;
        }
      }

      // b) 배열 형태 [{ userId, ... }]
      if (Array.isArray(map)) {
        const byId = post.authorId
          ? (map as UserProfile[]).find((p) => String(p.userId) === String(post.authorId))
          : undefined;
        if (byId?.nickname || byId?.name) return byId.nickname ?? byId.name!;

        if (post.authorEmail) {
          const byEmail = (map as UserProfile[]).find(
            (p) => p.email && p.email.toLowerCase() === post.authorEmail!.toLowerCase()
          );
          if (byEmail?.nickname || byEmail?.name) return byEmail.nickname ?? byEmail.name!;
        }
      }
    }
  } catch (e) {
    console.log('profile lookup error', e);
  }

  // 3) 같은 작성자의 다른 글에서 authorName 추출
  try {
    const raw = await AsyncStorage.getItem(POSTS_KEY);
    const list: LostPost[] = raw ? JSON.parse(raw) : [];
    const candidate = list.find(
      (p) =>
        (post.authorId && p.authorId && String(p.authorId) === String(post.authorId)) ||
        (post.authorEmail &&
          p.authorEmail &&
          p.authorEmail.toLowerCase() === post.authorEmail.toLowerCase())
    );
    if (candidate?.authorName && candidate.authorName.trim()) {
      return candidate.authorName.trim();
    }
  } catch (e) {
    console.log('scan posts for authorName error', e);
  }

  // 4) 이메일 로컬파트
  const fromEmail = nicknameFromEmail(post.authorEmail ?? null);
  if (fromEmail) return fromEmail;

  // 5) 마지막 폴백
  return '익명';
}

/** ===================== 컴포넌트 ===================== */
export default function LostDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'LostDetail'>) {
  const { id } = route.params;

  // 상세 데이터/상태
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

  /** ✅ 대표 이미지 선택 유틸(없으면 undefined 반환)
   *  - 채팅방 카드에 쓸 썸네일 1장을 고름(첫 장)
   */
  const getRepresentativeImage = (arr?: string[]) =>
    Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;

  /** 내 로컬 식별자 로드 */
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

  /** 상세 데이터 로드 */
  const loadDetail = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list: LostPost[] = raw ? JSON.parse(raw) : [];
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
      console.log('lost detail load error', e);
      Alert.alert('오류', '게시글을 불러오지 못했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    }
  }, [id, navigation, syncCount]);

  // 최초 로드
  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // 포커스마다 리프레시
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      loadDetail();
    });
    return unsub;
  }, [navigation, loadDetail]);

  /** 내가 작성자인지 판별(아이디/이메일/파라미터 기반) */
  const isOwner = useMemo(() => {
    const p = (route.params as any)?.isOwner;
    if (coerceTrue(p)) return true;
    if (sameId(item?.authorId, myId)) return true;
    if (sameEmail(item?.authorEmail ?? null, myEmail)) return true;
    return false;
  }, [route.params, item?.authorId, item?.authorEmail, myId, myEmail]);

  /** 배지 텍스트/플래그 */
  const badgeLabel = useMemo(() => (item?.type === 'lost' ? '분실' : '습득'), [item]);
  const isLost = item?.type === 'lost';

  /** 수평 이미지 스크롤 인덱스 갱신 */
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고하기 */
  const onPressReport = () => {
    const targetLabel = `${item?.authorDept ?? 'AI학부'} - ${item?.authorName ?? DISPLAY_NAME_FALLBACK}`;
    navigation.navigate('Report', { targetLabel });
  };

  /** =============== 작성자 '표시 이름' 상태 =============== */
  const [authorDisplayName, setAuthorDisplayName] = useState<string>('익명');

  /** item 로드 후, 가능한 경로에서 닉네임을 찾아 세팅 */
  useEffect(() => {
    if (!item) return;
    (async () => {
      const name = await resolveAuthorDisplayName(item);
      setAuthorDisplayName(name);
    })();
  }, [item?.authorId, item?.authorEmail, item?.authorName, item]);

  /** ✅ 최종 표기용 이름: 탐색 실패('익명') 시 하드코딩 폴백(채히) 사용 */
  const finalAuthorName = useMemo(() => {
    const n = (authorDisplayName ?? '').trim();
    if (!n || n === '익명') {
      // 글 자체에 저장된 authorName이 있으면 그걸 우선 사용, 없으면 채히
      return (item?.authorName && item.authorName.trim()) || DISPLAY_NAME_FALLBACK;
    }
    return n;
  }, [authorDisplayName, item?.authorName]);

  /** ===================== 렌더링 가드 ===================== */
  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  /** 오너 메뉴 토글 */
  const openOwnerMenu = () => setOwnerMenuVisible(true);
  const closeOwnerMenu = () => setOwnerMenuVisible(false);

  /** 수정 */
  const onOwnerEdit = () => {
    closeOwnerMenu();
    navigation.navigate('LostPost', { mode: 'edit', id: String(item.id) });
  };

  /** 삭제 */
  const onOwnerDelete = async () => {
    closeOwnerMenu();
    await confirmAndDelete();
  };

  /** ===================== JSX ===================== */
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

          {/* 소유자 옵션 모달 */}
          {isOwner && ownerMenuVisible && (
            <>
              <TouchableOpacity
                style={styles.ownerDim}
                activeOpacity={1}
                onPress={closeOwnerMenu}
              />
              <View style={styles.ownerMenuCard}>
                <TouchableOpacity
                  onPress={onOwnerEdit}
                  style={styles.ownerMenuItem}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ownerMenuText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onOwnerDelete}
                  style={styles.ownerMenuItem}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ownerMenuTextDanger}>삭제</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ===== 본문 ===== */}
        <View style={styles.body}>
          {/* 작성자 프로필(닉네임 우선 노출) */}
          <ProfileRow
            name={finalAuthorName}
            dept={item?.authorDept ?? 'AI학부'}
          />

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

      {/* ===== 하단 고정 바 ===== */}
      <DetailBottomBar
        variant="detail"
        initialLiked={liked}
        onToggleLike={async (nextLiked: boolean) => {
          await setLikedPersisted(nextLiked);
          setItem(prev => {
            if (!prev) return prev;
            const nextCount = Math.max(0, (prev.likeCount ?? 0) + (nextLiked ? 1 : -1));
            return { ...prev, likeCount: nextCount };
          });
        }}
        /** ✅ A 방식: 자동 네비게이션
         * - 입력한 텍스트는 내부에서 initialMessage로 ChatRoom에 전달됨
         * - posterNickname은 최종 표시 이름(finalAuthorName) 사용
         */
        chatAutoNavigateParams={{
          source: 'lost',
          postId: String(item.id),
          posterNickname: finalAuthorName,
          postTitle: item.title,
          place: item.location,
          purpose: item.type, // 'lost' | 'found'
          postImageUri: getRepresentativeImage(item.images),
        }}
        placeholder="게시자에게 메시지를 보내보세요"
      />
    </View>
  );
}
