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

import { DeviceEventEmitter } from 'react-native';
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

// ✅ 전체화면 이미지 뷰어(외부 라이브러리)
import ImageViewing from 'react-native-image-viewing';

const POSTS_KEY = 'groupbuy_posts_v1';
const LIKED_MAP_KEY = 'groupbuy_liked_map_v1';
const COUNT_MAP_KEY = 'groupbuy_current_count_map_v1'; // 현재 인원 캐시
const SCREEN_WIDTH = Dimensions.get('window').width;
const EVT_TRADE_HISTORY_UPDATED = 'EVT_TRADE_HISTORY_UPDATED';

const COUNT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
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

  /** 서버 정수 PK (신고용) */
  serverPostId?: number;
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
  patchedGuard?: { value: number; ts: number } | null,
): number {
  const now = Date.now();
  if (patchedGuard && now - patchedGuard.ts <= PATCH_PROTECT_MS) {
    return patchedGuard.value;
  }
  const cached = cache[String(id)];
  if (serverValue === 0 && cached && now - cached.ts <= COUNT_CACHE_TTL_MS) {
    return cached.value;
  }
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

  const currentCountRef = useRef<number>(0);
  const lastPatchedRef = useRef<{ value: number; ts: number } | null>(null);
  const loadingRef = useRef(false);

  // ✅ 상세 이미지 전체화면 뷰어 상태
  const [viewerVisible, setViewerVisible] = useState(false); // 모달 보이기/숨기기
  const [viewerIndex, setViewerIndex] = useState(0);         // 시작 인덱스
  
  // 이미지 탭 시 해당 인덱스에서 뷰어 오픈
  const openViewerAt = useCallback((startIdx: number) => {
    setViewerIndex(startIdx);
    setViewerVisible(true);
  }, []);
  const closeViewer = useCallback(() => setViewerVisible(false), []);

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
      const images =
        Array.isArray(d?.images) && d.images.length
          ? [...d.images]
              .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
              .map((x: any) => x.imageUrl)
          : d?.thumbnailUrl
          ? [d.thumbnailUrl]
          : [];

      // 서버 정수 PK 추출
      const serverIdNum =
        typeof d?.id === 'number'
          ? d.id
          : typeof d?.post_id === 'number'
          ? d.post_id
          : Number.NaN;

      let nextCurrent = coerceCurrentCount(d, prev?.currentCount ?? currentCountRef.current);

      const cacheLike: CountMap =
        countFromCache != null
          ? { [String(id)]: { value: countFromCache, ts: Date.now() } }
          : {};
      nextCurrent = pickWithCache(nextCurrent, cacheLike, id, lastPatchedRef.current);

      currentCountRef.current = typeof nextCurrent === 'number' ? nextCurrent : 0;

      const mapped: GroupBuyPost = {
        id: String(d.id ?? d.post_id),
        serverPostId: Number.isFinite(serverIdNum) ? serverIdNum : undefined,
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

        authorName: d.authorNickname ?? undefined,
        authorDept: d.authorDepartment ?? '',
        authorEmail: d.authorEmail ?? null,
        authorId:
          d.authorId ??
          d.author_id ??
          d.writerId ??
          d.writer_id ??
          d.userId ??
          d.user_id ??
          undefined,

        currentCount: currentCountRef.current,
        status: d.status,
      };
      return mapped;
    },
    [id],
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
      console.log('[GroupBuyDetail] server load failed -> local fallback', (e as any)?.response?.data || e);
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
          console.log('[GroupBuyDetail] fallback item', found);
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

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
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
    true,
  );

  const authorName = item?.authorName;
  const authorDept = item?.authorDept;

  const profileName = useMemo(
    () => authorName || lookupName || '사용자',
    [authorName, lookupName],
  );
  const profileDept = useMemo(
    () => authorDept || lookupDept || '',
    [authorDept, lookupDept],
  );

  /** 이미지 인덱스 */
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고 */
  const onPressReport = useCallback(() => {
    if (!item) return;

    const numericPostId =
      typeof item.serverPostId === 'number' && Number.isFinite(item.serverPostId)
        ? String(item.serverPostId)
        : /^\d+$/.test(String(item.id))
        ? String(item.id)
        : undefined;

    console.log('[GroupBuyDetail] 신고 이동 파라미터', {
      authorEmail: item.authorEmail ?? null,
      numericPostId,
      reportedIdCandidate: item.authorId,
    });

    navigation.navigate('Report', {
      mode: 'compose',
      targetNickname: profileName,
      targetDept: profileDept,
      targetEmail: item.authorEmail ?? undefined, // ✅ undefined로 정규화
      targetPostId: numericPostId,                // ✅ 서버 숫자 id 우선
      targetStorageKey: POSTS_KEY,
      targetPostTitle: item.title,
      targetKind: 'groupbuy',
      targetUserId: item.authorId,                // 있으면 같이 전달
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

      // ✅ (핵심) "거래내역 > 공동구매 > 신청" 탭 갱신 이벤트 브로드캐스트
      DeviceEventEmitter.emit(EVT_TRADE_HISTORY_UPDATED, {
        domain: 'groupbuy',
        action: 'applied',
        postId: String(item.serverPostId ?? item.id),
      });

      // 상세(현재인원 등) 재로딩
      await loadDetail();

      // 링크 열기(옵션)
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
    await saveCountToMap(id, n);

    try {
      await updateGroupBuyCurrentCount(id, n);
      setTimeout(() => {
        loadDetail();
      }, 350);

      // 목록 캐시에도 반영
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

  const images =
    Array.isArray(item.images) && item.images.length > 0 ? item.images : [];
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
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                setIndex(Math.round(x / SCREEN_WIDTH));
              }}
              contentOffset={{ x: 0, y: 0 }}
            >
              {images.map((uri, i) => (
                // ✅ 각 이미지 탭 시 해당 인덱스에서 전체화면 오픈
                <TouchableOpacity
                  key={`${uri}-${i}`}
                  activeOpacity={0.9}
                  onPress={() => openViewerAt(i)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`이미지 ${i + 1} 크게 보기`}
                >
                  <Image key={`${uri}-${i}`} source={{ uri }} style={styles.mainImage} />
                </TouchableOpacity>
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
              <View style={styles.countStaticWrap}>
                <Text style={styles.countStaticText}>{item.currentCount ?? 0}</Text>
              </View>
            ) : (
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

      {/* ✅ 전체화면 이미지 뷰어 (핀치줌/더블탭/스와이프다운 닫기 지원) */}
      <ImageViewing
        images={images.map((u) => ({ uri: u }))}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={closeViewer}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        FooterComponent={({ imageIndex }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{`${imageIndex + 1} / ${images.length}`}</Text>
            </View>
            {/* <Text style={{ color: '#fff', opacity: 0.9 }}>두 번 탭해서 확대/축소 • 아래로 스와이프해 닫기</Text> */}
          </View>
        )}
      />

      {/* 하단 바: 비작성자만 노출 */}
      {!isOwner && (
        <DetailBottomBar
          initialLiked={liked}
          onToggleLike={async (nextLiked) => {
            // ✅ 서버 동기화 포함 토글 (실패 시 자동 롤백)
            await toggleLike(nextLiked);
            setItem((prev) => {
              if (!prev) return prev;
              const nextCount = Math.max(
                0,
                (prev.likeCount ?? 0) + (nextLiked ? 1 : -1),
              );
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
            authorId: item.authorId as any,            // 숫자/문자 모두 허용, 내부에서 숫자 변환
            authorEmail: item.authorEmail ?? undefined // 혹시 모를 폴백용(현재는 미사용)
          }}
        />
      )}

      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner}
          onEdit={() =>
            navigation.navigate('GroupBuyRecruit', { mode: 'edit', id })
          }
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
