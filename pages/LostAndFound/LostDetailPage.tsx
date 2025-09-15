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
import AdminActionSheet from '../../components/Modals/AdminActionSheet/AdminActionSheet';
import { useDeletePost } from '../../hooks/useDeletePost';
import { useLike } from '../../hooks/useLike';
import usePermissions from '../../hooks/usePermissions';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './LostDetailPage.styles';

// ✅ 이메일 기반 표기 훅
import useDisplayProfile from '../../hooks/useDisplayProfile';
// ✅ 실제 파일 경로: components/Profile/ProfileRow.tsx
import ProfileRow from '../../components/Profile/ProfileRow';

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

export default function LostDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'LostDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<LostPost | null>(null);
  const [index, setIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
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
    confirmMessage: '정말로 이 게시글을 삭제할까요?',
    confirmOkText: '삭제',
    confirmCancelText: '취소',
  });

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

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => loadDetail());
    return unsub;
  }, [navigation, loadDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  /** ✅ 권한 파생(관리자 우선 정책) */
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  /** ✅ 프로필 표기: 이메일 우선 조회 → 없으면 게시글 메타 폴백 */
  const { name: lookupName, dept: lookupDept } = useDisplayProfile(item?.authorEmail ?? null, true);
  const profileName = useMemo(
    () => (lookupName || item?.authorName || '사용자'),
    [lookupName, item?.authorName]
  );
  const profileDept = useMemo(
    () => (lookupDept || item?.authorDept || ''),
    [lookupDept, item?.authorDept]
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  const onPressReport = () => {
    const targetLabel = `${profileDept || '학부 미설정'} - ${profileName}`;
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
          >
            <Image source={require('../../assets/images/back_white.png')} style={styles.icon} />
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
          {/* ✅ 이메일 기반 최신 표기값 */}
          <ProfileRow name={profileName} dept={profileDept} />

          <View style={styles.divider} />

          {/* 뱃지 + 제목 */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                item.type === 'lost' ? styles.badgeLost : styles.badgeFound,
              ]}
            >
              <Text style={styles.badgeText}>{item.type === 'lost' ? '분실' : '습득'}</Text>
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

      {/* ===== 하단 고정 바: 관리자/작성자는 숨김 ===== */}
      {!(isAdmin || isOwner) && (
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
          chatAutoNavigateParams={{
            source: 'lost',
            postId: String(item.id),
            posterNickname: profileName,
            postTitle: item.title,
            place: item.location,
            purpose: item.type,
            postImageUri: images[0],
          }}
          placeholder="게시자에게 메시지를 보내보세요"
        />
      )}

      {/* ✅ 관리자/소유자 공통 옵션 모달 */}
      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner} // 관리자이면 수정 숨김
          onEdit={() => navigation.navigate('LostPost', { mode: 'edit', id: String(item.id) })}
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
