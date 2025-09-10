import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ProfileRow from '../../components/Profile/ProfileRow';
import { useDeletePost } from '../../hooks/useDeletePost';
import { useLike } from '../../hooks/useLike';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './NoticeDetailPage.styles';

const POSTS_KEY = 'notice_posts_v1';
const LIKED_MAP_KEY = 'notice_liked_map_v1';
const AUTH_IS_ADMIN_KEY = 'auth_is_admin';
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Types from storage ────────────────────────────────────────────────────────
type StoredNotice = {
  id: string;
  title: string;
  description: string;
  images?: string[];
  startDate?: string;  // ISO
  endDate?: string;    // ISO
  createdAt?: string;  // ISO
  applyUrl?: string | null;
  likeCount?: number;
  authorName?: string;
  authorDept?: string;
};

// ─── UI model for this page ────────────────────────────────────────────────────
type NoticeItem = {
  id: string;
  title: string;
  description: string;
  images: string[];
  likeCount: number;

  // derived
  termText: string;              // e.g. "2025-03-01 ~ 2025-07-31"
  timeAgoText: string;           // e.g. "1시간 전"
  status: 'open' | 'closed';     // endDate < now ? closed : open
  link?: string;                 // from applyUrl

  authorName?: string;
  authorDept?: string;
  createdAt?: string;            // ISO
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}
function ymd(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function normalizeNotice(raw: StoredNotice): NoticeItem {
  const startIso = raw.startDate ?? raw.createdAt ?? new Date().toISOString();
  const endIso = raw.endDate ?? raw.startDate ?? raw.createdAt ?? new Date().toISOString();
  const open = new Date(endIso).getTime() >= Date.now();

  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    images: Array.isArray(raw.images) ? raw.images : [],
    likeCount: typeof raw.likeCount === 'number' ? raw.likeCount : 0,

    termText: `${ymd(startIso)} ~ ${ymd(endIso)}`,
    timeAgoText: timeAgo(raw.createdAt ?? startIso),
    status: open ? 'open' as const : 'closed' as const,
    link: raw.applyUrl ?? undefined,

    authorName: raw.authorName,
    authorDept: raw.authorDept,
    createdAt: raw.createdAt,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NoticeDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'NoticeDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<NoticeItem | null>(null);
  const [index, setIndex] = useState(0);
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const hScrollRef = useRef<ScrollView | null>(null);

  const { liked, syncCount, setLikedPersisted } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
  });

  const { confirmAndDelete } = useDeletePost({
    postId: id,
    postsKey: POSTS_KEY,
    likedMapKey: LIKED_MAP_KEY,
    navigation,
    confirmTitle: '삭제',
    confirmMessage: '정말로 이 공지사항을 삭제할까요?',
    confirmOkText: '삭제',
    confirmCancelText: '취소',
  });

  // 관리자 여부 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const adminFlag = await AsyncStorage.getItem(AUTH_IS_ADMIN_KEY);
        if (!mounted) return;
        const paramAdmin = (route.params as any)?.isAdmin;
        const derived =
          typeof paramAdmin === 'boolean'
            ? paramAdmin
            : adminFlag === 'true' || adminFlag === '1';
        setIsAdmin(!!derived);
      } catch (e) {
        if (!mounted) return;
        console.log('auth load error', e);
      }
    })();
    return () => { mounted = false; };
  }, [route.params]);

  // 최초 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: StoredNotice[] = raw ? JSON.parse(raw) : [];
        const foundRaw = list.find((p) => p.id === id) ?? null;
        if (!mounted) return;

        if (!foundRaw) {
          Alert.alert('알림', '해당 공지를 찾을 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        const normalized = normalizeNotice(foundRaw);
        setItem(normalized);
        syncCount(normalized.likeCount);
      } catch (e) {
        if (!mounted) return;
        console.log('notice detail load error', e);
        Alert.alert('오류', '공지사항을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    })();
    return () => { mounted = false; };
  }, [id, navigation, syncCount]);

  // 복귀 시 리로드
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(POSTS_KEY);
          const list: StoredNotice[] = raw ? JSON.parse(raw) : [];
          const foundRaw = list.find((p) => p.id === id) ?? null;
          if (!mounted) return;

          if (foundRaw) {
            const normalized = normalizeNotice(foundRaw);
            setItem(normalized);
            syncCount(normalized.likeCount);
          }
        } catch (e) {
          if (!mounted) return;
          console.log('notice detail reload error', e);
        }
      })();
      return () => { mounted = false; };
    }, [id, syncCount])
  );

  const profileName = item?.authorName ?? '운영자';
  const profileDept = item?.authorDept ?? '관리자';

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  const onPressOpenLink = () => {
    if (!item?.link) return;
    const url = /^https?:\/\//i.test(item.link) ? item.link : `https://${item.link}`;
    Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
  };

  const openAdminMenu = () => setAdminMenuVisible(true);
  const closeAdminMenu = () => setAdminMenuVisible(false);
  const onAdminEdit = () => {
    closeAdminMenu();
    navigation.navigate('NoticeWrite', { mode: 'edit', id });
  };
  const onAdminDelete = async () => {
    closeAdminMenu();
    await confirmAndDelete();
  };

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>공지사항을 불러오는 중...</Text>
      </View>
    );
  }

  const images = item.images ?? [];
  const badgeText = item.status === 'closed' ? '모집마감' : '모집중';
  const badgeStyle = item.status === 'closed' ? styles.badgeClosed : styles.badgeOpen;

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

          {/* 우상단: 관리자만 옵션 */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconRightTop]}
              onPress={openAdminMenu}
              accessibilityRole="button"
              accessibilityLabel="공지 옵션"
              activeOpacity={0.9}
            >
              <Image source={require('../../assets/images/tab.png')} style={styles.icon} />
            </TouchableOpacity>
          )}

          {/* 우하단: 1 / N 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>

          {/* 관리자 옵션 모달 */}
          {isAdmin && adminMenuVisible && (
            <>
              <TouchableOpacity style={styles.ownerDim} activeOpacity={1} onPress={closeAdminMenu} />
              <View style={styles.ownerMenuCard}>
                <TouchableOpacity onPress={onAdminEdit} style={styles.ownerMenuItem} activeOpacity={0.8}>
                  <Text style={styles.ownerMenuText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onAdminDelete} style={styles.ownerMenuItem} activeOpacity={0.8}>
                  <Text style={styles.ownerMenuTextDanger}>삭제</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ===== 본문 ===== */}
        <View style={styles.body}>
          <ProfileRow name={profileName} dept={profileDept} />

          <View style={styles.divider} />

          <View style={styles.titleLine}>
            <View style={[styles.badgeBase, badgeStyle]}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            {/* 우측 하트 토글 */}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={async () => {
                const nextLiked = !liked;
                await setLikedPersisted(nextLiked);
                setItem((prev) => {
                  if (!prev) return prev;
                  const nextCount = Math.max(0, (prev.likeCount ?? 0) + (nextLiked ? 1 : -1));
                  return { ...prev, likeCount: nextCount };
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="좋아요"
            >
              <Image
                source={
                  liked
                    ? require('../../assets/images/redheart.png')
                    : require('../../assets/images/heart.png')
                }
                style={styles.heartIcon}
              />
            </TouchableOpacity>
          </View>

          {/* 기간 */}
          {!!item.termText && (
            <Text style={styles.term} numberOfLines={1}>
              {item.termText}
            </Text>
          )}
          {!!item.timeAgoText && <Text style={styles.timeAgo}>{item.timeAgoText}</Text>}

          {/* 본문 */}
          {!!item.description && (
            <View style={styles.descCard}>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          )}

          {/* 신청 링크 */}
          {!!item.link && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionLabel}>신청 링크</Text>
              <TouchableOpacity onPress={onPressOpenLink} activeOpacity={0.8}>
                <Text style={styles.linkText} numberOfLines={2}>
                  {item.link}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </View>
  );
}
