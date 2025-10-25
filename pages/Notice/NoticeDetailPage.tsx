// pages/Notice/NoticeDetailPage.tsx
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import AdminActionSheet from '../../components/Modals/AdminActionSheet/AdminActionSheet';
import ProfileRow from '../../components/Profile/ProfileRow';
import usePermissions from '../../hooks/usePermissions';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './NoticeDetailPage.styles';

import {
  deleteNotice,
  getNoticeDetail,
  type NoticeResponse,
} from '../../api/notices';
import { toAbsoluteUrl } from '../../api/url';

// ✅ 서버 동기화 하트 토글 훅 추가
import { useLike } from '@/hooks/useLike';

// ✅ 전체화면 이미지 뷰어(외부 라이브러리)
import ImageViewing from 'react-native-image-viewing';

const LIKED_MAP_KEY = 'notice_liked_map_v1';
const SCREEN_WIDTH = Dimensions.get('window').width;

/** 서버 응답(NoticeResponse) → 화면에서 쓰기 편한 UI 모델로 변환 */
function toUi(raw: NoticeResponse) {
  // 1) 이미지 배열 (상세 응답에만 images가 옴)
  const imageUrls =
    Array.isArray((raw as any).images)
      ? (raw as any).images
          .map((it: any) => it?.imageUrl ?? it?.url ?? null)
          .filter(Boolean)
          .map((u: string) => toAbsoluteUrl(u)!) // ✅ 절대 URL로 변환
      : [];

  console.log('[NOTICE IMG] raw.images =', (raw as any).images);
  console.log('[NOTICE IMG] final absolute urls =', imageUrls);

  const startIso = raw.startDate ?? raw.createdAt;
  const endIso = raw.endDate ?? raw.startDate ?? raw.createdAt;

  const ymd = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const timeAgo = (iso?: string | null) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    return `${d}일 전`;
  };

  // 상태: ENUM + 기간으로 닫힘 판단
  const isClosedEnum = raw.status === 'COMPLETED' || raw.status === 'DELETED';
  const isClosedTime = endIso ? new Date(endIso).getTime() < Date.now() : false;
  const status = isClosedEnum || isClosedTime ? ('closed' as const) : ('open' as const);

  // ✅ 북마크 키 호환 처리 (isBookmarked 또는 bookmarked) — 서버가 내려주면 즉시 반영 가능
  const bookmarkedFlag = (raw as any).isBookmarked ?? (raw as any).bookmarked ?? false;

  return {
    id: String(raw.id),
    title: raw.title ?? '',
    description: raw.content ?? '',
    images: imageUrls as string[],
    termText: `${ymd(startIso)} ~ ${ymd(endIso)}`,
    timeAgoText: timeAgo(raw.createdAt),
    status,
    link: raw.link ?? undefined,
    authorName: raw.authorNickname ?? '운영자',
    authorDept: '관리자',
    createdAt: raw.createdAt,
    bookmarked: !!bookmarkedFlag,
  };
}

export default function NoticeDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'NoticeDetail'>) {
  const { id } = route.params;
  const { isAdmin } = usePermissions({ routeParams: route.params });

  const [data, setData] = useState<NoticeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ 하트(북마크) 훅: 로컬(AsyncStorage) + 서버 동기화(/board/bookmarks)
  // - postType: 'NOTICE' 로 고정
  // - likedMapKey: 공지용 키 유지
  const { liked, /* likeCount not used, */ /* setLikedPersisted, */ toggleLike } = useLike({
    itemId: String(id),
    likedMapKey: LIKED_MAP_KEY,
    // 공지 리스트를 캐시에 함께 쓰고 있다면 postsKey 추가 가능
    initialCount: 0, // 공지는 카운트가 없으니 0 유지
    postType: 'NOTICE',
    syncServer: true,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNoticeDetail(id);
      console.log('[NOTICE DETAIL RAW]', JSON.stringify(res, null, 2));

      // ✅ 서버가 isBookmarked/bookmarked 내려줄 경우, 여기서 UI 초기 라벨만 참고.
      // useLike는 로컬 스토리지 기준으로 초기화되므로,
      // 서버 초기값을 즉시 강제 반영하려면 useLike에 initialLiked를 추가하는 식으로 확장 가능.
      setData(res);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        '공지사항을 불러오지 못했어요.';
      Alert.alert('오류', msg, [{ text: '확인', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const confirmAndDelete = useCallback(() => {
    Alert.alert('삭제', '정말로 이 공지사항을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNotice(id);
            Alert.alert('완료', '삭제되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() },
            ]);
          } catch (e: any) {
            const msg =
              e?.response?.data?.message ||
              e?.response?.data?.error ||
              e?.message ||
              '삭제에 실패했습니다.';
            Alert.alert('오류', msg);
          }
        },
      },
    ]);
  }, [id, navigation]);

  const ui = useMemo(() => (data ? toUi(data) : null), [data]);

  const [index, setIndex] = useState(0);
  const hScrollRef = useRef<ScrollView | null>(null);
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  const [adminMenuVisible, setAdminMenuVisible] = useState(false);

  const onPressOpenLink = useCallback(() => {
    if (!ui?.link) return;
    const url = /^https?:\/\//i.test(ui.link) ? ui.link : `https://${ui.link}`;
    Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
  }, [ui?.link]);

  // =========================
  // ✅ 전체화면 이미지 뷰어 상태
  // =========================
  const [viewerVisible, setViewerVisible] = useState(false); // 뷰어 노출 여부
  const [viewerIndex, setViewerIndex] = useState(0);         // 시작 인덱스

  // 이미지 탭 시 해당 인덱스에서 뷰어 오픈
  const openViewerAt = useCallback((startIdx: number) => {
    setViewerIndex(startIdx);
    setViewerVisible(true);
  }, []);

  // 뷰어 닫기
  const closeViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

  if (loading || !ui) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>공지사항을 불러오는 중...</Text>
      </View>
    );
  }

  const images = ui.images ?? [];
  const badgeText = ui.status === 'closed' ? '모집마감' : '모집중';
  const badgeStyle = ui.status === 'closed' ? styles.badgeClosed : styles.badgeOpen;

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 상단 이미지 */}
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
                // ✅ 각 이미지에 onPress를 달아 전체화면 뷰어 오픈
                <TouchableOpacity
                  key={`${uri}-${i}`}
                  activeOpacity={0.9}
                  onPress={() => openViewerAt(i)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`이미지 ${i + 1} 크게 보기`}
                >
                  <Image
                    source={{ uri }}
                    style={styles.mainImage}
                    onLoad={() => console.log('[IMG LOAD OK]', uri)}
                    onError={(e) => {
                      const err = (e?.nativeEvent as any) || {};
                      console.warn('[IMG LOAD ERR]', uri, err?.error ?? err);
                    }}
                  />
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

          {/* 우상단: 관리자만 옵션 */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconRightTop]}
              onPress={() => setAdminMenuVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="공지 옵션"
              activeOpacity={0.9}
            >
              <Image source={require('../../assets/images/more_white.png')} style={styles.icon} />
            </TouchableOpacity>
          )}

          {/* 우하단: 1 / N 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {/* 본문 */}
        <View style={styles.body}>
          <ProfileRow name={ui.authorName} dept={ui.authorDept} />

          <View style={styles.divider} />

          <View style={styles.titleLine}>
            <View style={[styles.badgeBase, badgeStyle]}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>

            <Text style={styles.title} numberOfLines={2}>{ui.title}</Text>

            {/* ✅ 우측 하트: useLike 기반 서버 동기화 토글 */}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={() => toggleLike(!liked)} // 낙관적 업데이트 + 서버동기화 + 실패 시 롤백
              accessibilityRole="button"
              accessibilityLabel="좋아요"
              activeOpacity={0.8}
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

          {!!ui.termText && <Text style={styles.term} numberOfLines={1}>{ui.termText}</Text>}
          {!!ui.timeAgoText && <Text style={styles.timeAgo}>{ui.timeAgoText}</Text>}

          {!!ui.description && (
            <View style={styles.descCard}>
              <Text style={styles.descText}>{ui.description}</Text>
            </View>
          )}

          {!!ui.link && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionLabel}>신청 링크</Text>
              <TouchableOpacity onPress={onPressOpenLink} activeOpacity={0.8}>
                <Text style={styles.linkText} numberOfLines={2}>{ui.link}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ✅ 전체화면 이미지 뷰어 (Modal 형태) */}
      <ImageViewing
        images={images.map((u) => ({ uri: u }))}
        imageIndex={viewerIndex}        // 현재 시작 인덱스
        visible={viewerVisible}         // 노출 여부
        onRequestClose={closeViewer}    // 닫기
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        // 하단 푸터 커스텀: "현재 / 전체" + 닫기 가이드(간단 버전)
        FooterComponent={({ imageIndex }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                {`${imageIndex + 1} / ${images.length}`}
              </Text>
            </View>
            {/* <Text style={{ color: '#fff', opacity: 0.9 }}>두 번 탭하여 확대/축소, 아래로 스와이프하여 닫기</Text> */}
          </View>
        )}
      />

      {/* 관리자 전용 액션시트: 공지는 수정+삭제 */}
      <AdminActionSheet
        visible={isAdmin && adminMenuVisible}
        onClose={() => setAdminMenuVisible(false)}
        showEdit
        onEdit={() => navigation.navigate('NoticeWrite', { mode: 'edit', id })}
        onDelete={confirmAndDelete}
        editLabel="수정"
        deleteLabel="삭제"
      />
    </View>
  );
}
