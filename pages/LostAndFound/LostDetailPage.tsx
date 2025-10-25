// pages/LostAndFound/LostDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import AdminActionSheet from '../../components/Modals/AdminActionSheet/AdminActionSheet';
import { useDeletePost } from '../../hooks/useDeletePost';
import { useLike } from '../../hooks/useLike';
import usePermissions from '../../hooks/usePermissions';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './LostDetailPage.styles';

// 이메일 기반 표기 훅
import ProfileRow from '../../components/Profile/ProfileRow';
import useDisplayProfile from '../../hooks/useDisplayProfile';

// ✅ API
import { getLostFoundDetail } from '../../api/lost';

// ✅ 전체화면 이미지 뷰어(외부 라이브러리)
import ImageViewing from 'react-native-image-viewing';

const POSTS_KEY = 'lost_found_posts_v1';
const LIKED_MAP_KEY = 'lost_found_liked_map_v1';
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
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;
  /** 서버가 가진 정수 PK (신고에 사용) */
  serverPostId?: number;
};

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

export default function LostDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'LostDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<LostPost | null>(null);
  const [index, setIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const hScrollRef = useRef<ScrollView | null>(null);

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
    // ✅ 서버에 북마크(하트) 상태를 동기화
    postType: 'LOST_ITEM',
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

  /** 서버에서 상세 가져와서 화면 모델로 정규화 */
  const loadDetail = useCallback(async () => {
    try {
      const res = await getLostFoundDetail(id);
      console.log('[LostDetailPage] 상세 조회 성공(정규화전)', res);

      const serverIdNum =
        typeof (res as any)?.id === 'number'
          ? (res as any).id
          : typeof (res as any)?.post_id === 'number'
          ? (res as any).post_id
          : Number.NaN;

      const normalized: LostPost = {
        id: String((res as any).id ?? (res as any).post_id ?? id),
        serverPostId: Number.isFinite(serverIdNum) ? serverIdNum : undefined,
        type: res.purpose === 'LOST' ? 'lost' : 'found',
        title: res.title,
        content: res.content,
        location: res.location,
        images: Array.isArray(res.images) ? res.images.map((it: any) => it?.imageUrl).filter(Boolean) : [],
        likeCount: Number((res as any)?.bookmarkCount ?? 0),
        createdAt:
          (res as any).createdAt ??
          (res as any).created_at ??
          new Date().toISOString(),
        authorEmail: (res as any).authorEmail ?? null,
        authorName: (res as any).authorNickname ?? undefined,
        authorDept:
          (res as any).authorDepartment ?? (res as any).department ?? undefined,
        authorId:
          (res as any).authorId ??
          (res as any).author_id ??
          (res as any).writerId ??
          (res as any).writer_id ??
          (res as any).userId ??
          (res as any).user_id ??
          undefined,
      };

      setItem(normalized);
      syncCount(Number((res as any)?.bookmarkCount ?? 0));
    } catch (e) {
      console.log('lost detail api error -> try local fallback', e);
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: LostPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find((p) => String(p.id) === String(id)) ?? null;

        setItem(found);
        if (!found) {
          Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }
        syncCount(found.likeCount ?? 0);
      } catch (err) {
        console.log('lost detail load error', err);
        Alert.alert('오류', '게시글을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    }
  }, [id, navigation, syncCount]);

  useFocusEffect(
    React.useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  /** 권한 파생 */
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  /** 프로필 표기: 이메일 조회(있으면) → 닉네임 폴백 */
  const { name: lookupName, dept: lookupDept } = useDisplayProfile(
    item?.authorEmail ?? null,
    true,
  );

  const profileName = useMemo(
    () => lookupName || item?.authorName || '사용자',
    [lookupName, item?.authorName],
  );

  const profileDept = useMemo(
    () => lookupDept || item?.authorDept || '',
    [lookupDept, item?.authorDept],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고 이동 */
  const onPressReport = React.useCallback(() => {
    if (!item) return;

    const numericPostId =
      typeof item.serverPostId === 'number' && Number.isFinite(item.serverPostId)
        ? String(item.serverPostId)
        : /^\d+$/.test(String(item.id))
        ? String(item.id)
        : undefined;

    console.log('[LostDetailPage] 신고 이동 파라미터', {
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
      targetKind: 'lost',
      targetUserId: item.authorId,                // 있으면 같이 전달
    });
  }, [item, navigation, profileName, profileDept]);

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images =
    Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  const renderRightTopButton = () => {
    if (isAdmin || isOwner) {
      return (
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconRightTop]}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="게시글 옵션"
          activeOpacity={0.9}
        >
          <Image
            source={require('../../assets/images/more_white.png')}
            style={styles.icon}
          />
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
      >
        <Image
          source={require('../../assets/images/alert_white.png')}
          style={styles.icon}
        />
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
            <Image
              source={require('../../assets/images/back_white.png')}
              style={styles.icon}
            />
          </TouchableOpacity>

          {/* 우상단: 역할별 버튼 */}
          {renderRightTopButton()}

          {/* 우하단: "1 / N" 인디케이터 */}
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

          {/* 뱃지 + 제목 */}
          <View className="badgeRow" style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                item.type === 'lost' ? styles.badgeLost : styles.badgeFound,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.type === 'lost' ? '분실' : '습득'}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
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

      {/* 하단 고정 바: 작성자는 숨김 (관리자도 보이게) */}
      {!isOwner && (
        <DetailBottomBar
          variant="detail"
          initialLiked={liked}
          onToggleLike={async (nextLiked: boolean) => {
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
            source: 'lost',
            postId: String(item.id),
            posterNickname: profileName,
            postTitle: item.title,
            place: item.location,
            purpose: item.type,
            postImageUri: images[0],
            authorEmail: item.authorEmail ?? null,
            authorId: item.authorId != null ? String(item.authorId) : undefined,
          }}
          placeholder="게시자에게 메시지를 보내보세요"
        />
      )}

      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner}
          onEdit={() =>
            navigation.navigate('LostPost', { mode: 'edit', id: String(item.id) })
          }
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
