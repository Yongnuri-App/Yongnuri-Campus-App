// pages/GroupBuy/GroupBuyDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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

import {
  applyGroupBuy,
  getGroupBuyDetail,
  updateGroupBuyCurrentCount,
} from '../../api/groupBuy';
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';
import AdminActionSheet from '../../components/Modals/AdminActionSheet/AdminActionSheet';
import ProfileRow from '../../components/Profile/ProfileRow';
import { useDeletePost } from '../../hooks/useDeletePost';
import useDisplayProfile from '../../hooks/useDisplayProfile';
import { useLike } from '../../hooks/useLike';
import usePermissions from '../../hooks/usePermissions';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './GroupBuyDetailPage.styles';

const POSTS_KEY = 'groupbuy_posts_v1';
const LIKED_MAP_KEY = 'groupbuy_liked_map_v1';
const COUNT_MAP_KEY = 'groupbuy_current_count_map_v1'; // 현재 인원 캐시(서버가 0을 돌려줄 때 대비)
const SCREEN_WIDTH = Dimensions.get('window').width;

// 캐시 유효 시간(서버가 잠깐 0을 돌려줘도 이 시간 안에는 캐시 우선)
const COUNT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
// PATCH 직후 서버가 이전값을 돌려주는 플리킹 방지 보호 구간
const PATCH_PROTECT_MS = 4000;

type RecruitMode = 'unlimited' | 'limited' | null;

type GroupBuyPost = {
  id: string;
  title: string;
  description: string;
  recruit: { mode: RecruitMode; count: number | null };
  applyLink: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorId?: string | number;
  authorEmail?: string | null;

  /** 윗줄(닉네임) */
  authorName?: string;
  /** 아랫줄(학과) */
  authorDept?: string;

  /** 현재 모집 인원 */
  currentCount?: number;
  status?: 'RECRUITING' | 'COMPLETED' | 'DELETED';
};

type CountMap = Record<string, { value: number; ts: number }>;

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

/** 다양한 키 후보에서 currentCount 추출 (없으면 prev 유지) */
function coerceCurrentCount(d: any, prev?: number): number {
  const cands = [
    d?.currentCount,
    d?.current_count,
    d?.current,
    d?.currentMembers,
    d?.current_member_count,
    d?.participantCount,
    d?.participant_count,
  ];
  const firstNum = cands.find((v) => typeof v === 'number');
  if (typeof firstNum === 'number') return Number(firstNum);
  return typeof prev === 'number' ? prev : 0;
}

async function loadCountMap(): Promise<CountMap> {
  try {
    const raw = await AsyncStorage.getItem(COUNT_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveCountToMap(id: string | number, value: number) {
  try {
    const map = await loadCountMap();
    map[String(id)] = { value, ts: Date.now() };
    await AsyncStorage.setItem(COUNT_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** 서버값과 캐시/보호 구간을 고려해서 최종 currentCount 선택 */
function pickWithCache(
  serverValue: number,
  cache: CountMap,
  id: string | number,
  patchedGuard?: { value: number; ts: number } | null
): number {
  const now = Date.now();

  // PATCH 직후 보호 구간: 서버값이 뒤늦게 와도 당장 덮지 않음
  if (patchedGuard && now - patchedGuard.ts <= PATCH_PROTECT_MS) {
    return patchedGuard.value;
  }

  // 서버가 0을 돌려주고, 최근(24h) 캐시에 신뢰할 값이 있으면 캐시 우선
  const cached = cache[String(id)];
  if (serverValue === 0 && cached && now - cached.ts <= COUNT_CACHE_TTL_MS) {
    return cached.value;
  }

  // 그 외엔 서버값 신뢰
  return serverValue;
}

export default function GroupBuyDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'GroupBuyDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<GroupBuyPost | null>(null);
  const [index, setIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const hScrollRef = useRef<ScrollView | null>(null);

  /** 최신 currentCount 보존용 ref (플리커 방지) */
  const currentCountRef = useRef<number>(0);
  /** PATCH 직후 보호용 */
  const lastPatchedRef = useRef<{ value: number; ts: number } | null>(null);
  /** 중복 로딩 방지 */
  const loadingRef = useRef(false);

  const { liked, syncCount, toggleLike } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
    postType: 'GROUP_BUY',
    syncServer: true,
  });

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

  /** 서버 → 화면 상태 매핑 */
  const mapServerToState = useCallback(
    (d: any, prev?: GroupBuyPost | null, countFromCache?: number): GroupBuyPost => {
      // 이미지 정렬
      const images =
        Array.isArray(d?.images) && d.images.length
          ? [...d.images]
              .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
              .map((x) => x.imageUrl)
          : d?.thumbnailUrl
          ? [d.thumbnailUrl]
          : [];

      // 서버 currentCount
      let nextCurrent = coerceCurrentCount(d, prev?.currentCount ?? currentCountRef.current);

      // 캐시/보호 로직 적용
      const cacheLike: CountMap = countFromCache != null
        ? { [String(id)]: { value: countFromCache, ts: Date.now() } }
        : {};
      nextCurrent = pickWithCache(nextCurrent, cacheLike, id, lastPatchedRef.current);

      // ref 갱신
      currentCountRef.current = typeof nextCurrent === 'number' ? nextCurrent : 0;

      // 닉네임/학과 표기 확정: authorNickname(윗줄), authorDepartment(아랫줄)
      const mapped: GroupBuyPost = {
        id: String(d.id ?? d.post_id),
        title: d.title ?? '',
        description: d.content ?? '',
        recruit: {
          mode: d.limit == null ? 'unlimited' : 'limited',
          count: d.limit == null ? null : Number(d.limit),
        },
        applyLink: d.link ?? '',
        images,
        likeCount: Number(d.bookmarkCount ?? 0),
        createdAt: d.createdAt ?? d.created_at ?? new Date().toISOString(),

        authorName: d.authorNickname ?? undefined, // 윗줄
        authorDept: d.authorDepartment ?? '',       // 아랫줄(학과)
        authorEmail: d.authorEmail ?? null,

        currentCount: currentCountRef.current,
        status: d.status,
      };
      return mapped;
    },
    [id]
  );

  /** 상세 로드 */
  const loadDetail = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [d, map] = await Promise.all([getGroupBuyDetail(id), loadCountMap()]);
      const cached = map[String(id)];
      const cachedValue =
        cached && Date.now() - cached.ts <= COUNT_CACHE_TTL_MS ? cached.value : undefined;

      const serverVal = coerceCurrentCount(d, currentCountRef.current);
      const chosen = pickWithCache(serverVal, map, id, lastPatchedRef.current);

      currentCountRef.current = chosen;
      setItem((prev) => mapServerToState(d, prev, cachedValue));

      syncCount(Number(d?.bookmarkCount ?? 0));
    } catch (e) {
      console.log(
        '[GroupBuyDetail] server load failed -> local fallback',
        (e as any)?.response?.data || e
      );
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find((p) => String(p.id) === String(id)) ?? null;
        if (!found) {
          Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
        } else {
          currentCountRef.current = found.currentCount ?? 0;
          setItem(found);
          syncCount(found.likeCount ?? 0);
        }
      } catch (err) {
        console.log('groupbuy detail load error', err);
        Alert.alert('오류', '게시글을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [id, navigation, syncCount, mapServerToState]);

  /** 포커스 시마다 최신화 */
  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  /** 권한 */
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  /** 프로필 라인: 윗줄(닉네임) / 아랫줄(학과) */
  const { name: lookupName, dept: lookupDept } = useDisplayProfile(
    item?.authorEmail ?? null,
    true
  );

  // ✅ useMemo 의존성 경고 방지: 로컬 변수로 분리
  const authorName = item?.authorName;
  const authorDept = item?.authorDept;

  const profileName = useMemo(
    () => (authorName || lookupName || '사용자'),
    [authorName, lookupName]
  );
  const profileDept = useMemo(
    () => (authorDept || lookupDept || ''),
    [authorDept, lookupDept]
  );

  /** 이미지 인덱스 */
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고 */
  const onPressReport = useCallback(() => {
    if (!item) return;
    navigation.navigate('Report', {
      mode: 'compose',
      targetNickname: profileName,
      targetDept: profileDept,
      targetEmail: item.authorEmail ?? null,
      targetPostId: String(item.id),
      targetStorageKey: POSTS_KEY,
      targetPostTitle: item.title,
      targetKind: 'groupbuy',
    });
  }, [item, navigation, profileName, profileDept]);

  /** 신청 (작성자는 불가) */
  const onPressApply = async () => {
    if (!item) return;

    if (isOwner) {
      Alert.alert('안내', '자신이 작성한 게시글에는 신청할 수 없어요.');
      return;
    }

    try {
      const res = await applyGroupBuy(id);
      Alert.alert('신청 완료', res?.message ?? '공동구매 신청이 완료되었습니다.');

      // 최신 상세 재조회(현재 인원 반영)
      await loadDetail();

      // 신청 폼 링크가 있으면 열어줌
      if (item.applyLink) {
        const url = /^https?:\/\//i.test(item.applyLink)
          ? item.applyLink
          : `https://${item.applyLink}`;
        Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || '신청 중 오류가 발생했습니다.';
      Alert.alert('신청 실패', msg);
    }
  };

  /** 최대 모집수 */
  const maxCount = useMemo<number>(() => {
    if (!item) return 0;
    const limit = item.recruit?.mode === 'limited' ? (item.recruit?.count ?? 0) : 99;
    return Math.max(0, limit);
  }, [item]);

  const totalLabel =
    item?.recruit?.mode === 'limited'
      ? `(${item?.recruit?.count ?? 0}명)`
      : '(제한 없음)';

  /** 숫자 선택 (작성자만) */
  const onSelectCount = async (n: number) => {
    setPickerOpen(false);
    if (!item || !isOwner) return;

    // 1) 낙관적 반영 + 보호/캐시 저장
    lastPatchedRef.current = { value: n, ts: Date.now() };
    currentCountRef.current = n;
    setItem((cur) => (cur ? { ...cur, currentCount: n } : cur));
    await saveCountToMap(id, n); // 홈 나갔다가 돌아와도 유지

    try {
      await updateGroupBuyCurrentCount(id, n);

      // 2) 너무 빠른 stale 응답 방지를 위해 조금 지연 후 재조회
      setTimeout(() => {
        loadDetail();
      }, 350);

      // 3) 로컬 목록 캐시에도 반영(실패 무시)
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((p) => String(p.id) === String(id));
        if (idx >= 0) {
          list[idx].currentCount = n;
          await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));
        }
      } catch {}
    } catch (e: any) {
      console.log('[GroupBuyDetail] current-count patch error', e?.response?.data || e);
      Alert.alert('오류', e?.response?.data?.message || '모집 인원 변경에 실패했어요.');
      await loadDetail();
    }
  };

  const timeText = useMemo(() => (item ? timeAgo(item.createdAt) : ''), [item]);

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];
  const thumbUri = images[0];

  const RightTopButton = () =>
    (isAdmin || isOwner) ? (
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconRightTop]}
        onPress={() => setMenuVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="게시글 옵션"
        activeOpacity={0.9}
      >
        <Image source={require('../../assets/images/tab.png')} style={styles.icon} />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconRightTop]}
        onPress={onPressReport}
        accessibilityRole="button"
        accessibilityLabel="신고하기"
        activeOpacity={0.9}
      >
        <Image source={require('../../assets/images/alert_white.png')} style={styles.icon} />
      </TouchableOpacity>
    );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 160 }]}
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
          {/* 윗줄: 닉네임 / 아랫줄: 학과 */}
          <ProfileRow name={profileName} dept={profileDept} />

          <View style={styles.divider} />

          {/* 제목 + 신청 버튼 */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            <TouchableOpacity style={styles.applyBtn} activeOpacity={0.9} onPress={onPressApply}>
              <Text style={styles.applyBtnText}>신청</Text>
            </TouchableOpacity>
          </View>

          {/* 현재 모집 인원 */}
          <View style={styles.recruitLineRow}>
            <Text style={styles.recruitLineLabel}>현재 모집 인원</Text>

            {!isOwner ? (
              // 작성자 아님: 숫자만 표시
              <View style={styles.countStaticWrap}>
                <Text style={styles.countStaticText}>{item.currentCount ?? 0}</Text>
              </View>
            ) : (
              // 작성자: 드롭다운 선택
              <View style={styles.countPickerWrap}>
                <TouchableOpacity
                  onPress={() => setPickerOpen((v) => !v)}
                  activeOpacity={0.9}
                  style={styles.countPickerButton}
                >
                  <Text style={styles.countPickerValue}>{item.currentCount ?? 0}</Text>
                  <Image
                    source={require('../../assets/images/down.png')}
                    style={styles.countPickerIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {pickerOpen && (
                  <View style={styles.countDropdown}>
                    <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator>
                      {Array.from({ length: (maxCount ?? 0) + 1 }, (_, i) => i).map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={styles.countOption}
                          onPress={() => onSelectCount(n)}
                        >
                          <Text style={styles.countOptionText}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.recruitLineSuffix}>명 {totalLabel}</Text>
          </View>

          <Text style={styles.time}>{timeText}</Text>

          <View style={styles.descCard}>
            <Text style={styles.descText}>{item.description}</Text>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionLabel}>신청 링크</Text>
            <TouchableOpacity onPress={onPressApply} activeOpacity={0.8}>
              <Text style={styles.linkText} numberOfLines={2}>
                {item.applyLink}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* 하단 바: 비작성자만 노출 */}
      {!isOwner && (
        <DetailBottomBar
          initialLiked={liked}
          onToggleLike={async (nextLiked) => {
            // ✅ 서버 동기화 포함 토글 (실패 시 자동 롤백)
            await toggleLike(nextLiked);
            setItem((prev) => {
              if (!prev) return prev;
              const nextCount = Math.max(0, (prev.likeCount ?? 0) + (nextLiked ? 1 : -1));
              return { ...prev, likeCount: nextCount };
            });
          }}
          chatAutoNavigateParams={{
            source: 'groupbuy',
            postId: id,
            authorNickname: profileName,
            postTitle: item.title,
            recruitLabel:
              item.recruit?.mode === 'limited'
                ? `현재 모집 인원 ${item.currentCount ?? 0}명 (${item.recruit?.count ?? 0}명)`
                : `현재 모집 인원 ${item.currentCount ?? 0}명 (제한 없음)`,
            postImageUri: thumbUri,
          }}
        />
      )}

      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner}
          onEdit={() => navigation.navigate('GroupBuyRecruit', { mode: 'edit', id })}
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
