import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native'; // ✅ 복귀 시 리로드
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './GroupBuyDetailPage.styles';
import { useLike } from '../../hooks/useLike';
import ProfileRow from '../../components/Profile/ProfileRow';
import { useDeletePost } from '../../hooks/useDeletePost';

const POSTS_KEY = 'groupbuy_posts_v1';
const LIKED_MAP_KEY = 'groupbuy_liked_map_v1';
const AUTH_USER_ID_KEY = 'auth_user_id';
const SCREEN_WIDTH = Dimensions.get('window').width;

type RecruitMode = 'unlimited' | 'limited' | null;

type GroupBuyPost = {
  id: string;
  title: string;
  description: string;
  recruit: {
    mode: RecruitMode;
    count: number | null;
  };
  applyLink: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
  authorId?: string;
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

export default function GroupBuyDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'GroupBuyDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<GroupBuyPost | null>(null);
  const [index, setIndex] = useState(0);
  const [ownerMenuVisible, setOwnerMenuVisible] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
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

  // 내 ID 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
        if (mounted) setMyId(stored);
      } catch (e) {
        console.log('load my id error', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 최초 진입 시 게시글 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find((p) => p.id === id) ?? null;
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
        console.log('groupbuy detail load error', e);
        Alert.alert('오류', '게시글을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigation, syncCount]);

  // ✅ 수정 후 돌아오면 최신 내용으로 다시 로드
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(POSTS_KEY);
          const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
          const found = list.find((p) => p.id === id) ?? null;
          if (!mounted) return;
          setItem(found);
          if (found) syncCount(found.likeCount ?? 0);
        } catch (e) {
          if (!mounted) return;
          console.log('groupbuy detail reload error', e);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [id, syncCount])
  );

  const isOwner = useMemo(() => {
    const p = (route.params as any)?.isOwner;
    if (typeof p === 'boolean') return p;
    if (typeof p === 'string') return p === 'true' || p === '1';
    if (typeof p === 'number') return p === 1;
    if (item?.authorId && myId) return item.authorId === myId;
    return false;
  }, [route.params, item?.authorId, myId]);

  const timeText = useMemo(() => (item ? timeAgo(item.createdAt) : ''), [item]);

  const profileName = item?.authorName ?? '채히';
  const profileDept = item?.authorDept ?? 'AI학부';

  const recruitLabel =
    item?.recruit?.mode === 'unlimited' ? '제한 없음' : `${item?.recruit?.count ?? 0}명`;

  const currentCount = 0;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  const onPressReport = () => {
    const targetLabel = `${profileDept} - ${profileName}`;
    navigation.navigate('Report', { targetLabel });
  };

  const onPressApply = () => {
    if (!item?.applyLink) {
      Alert.alert('안내', '신청 링크가 없습니다.');
      return;
    }
    const url = /^https?:\/\//i.test(item.applyLink)
      ? item.applyLink
      : `https://${item.applyLink}`;
    Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
  };

  if (!item) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>게시글을 불러오는 중...</Text>
      </View>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];

  const openOwnerMenu = () => setOwnerMenuVisible(true);
  const closeOwnerMenu = () => setOwnerMenuVisible(false);

  // ✅ 수정 버튼: Recruit 페이지를 edit 모드로 재활용
  const onOwnerEdit = () => {
    closeOwnerMenu();
    navigation.navigate('GroupBuyRecruit', { mode: 'edit', id });
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

          {/* 우상단: 신고 or 소유자 메뉴 버튼 */}
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

          {/* 소유자 옵션 모달 (스타일 분리) */}
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
          <ProfileRow name={profileName} dept={profileDept} />

          <View style={styles.divider} />

          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            <TouchableOpacity style={styles.applyBtn} activeOpacity={0.9} onPress={onPressApply}>
              <Text style={styles.applyBtnText}>신청</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.recruitLine}>
            현재 모집 인원 {currentCount}명 ({recruitLabel})
          </Text>

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

      <DetailBottomBar
        initialLiked={liked}
        onToggleLike={async (nextLiked) => {
          await setLikedPersisted(nextLiked);
          setItem((prev) => {
            if (!prev) return prev;
            const nextCount = Math.max(0, (prev.likeCount ?? 0) + (nextLiked ? 1 : -1));
            return { ...prev, likeCount: nextCount };
          });
        }}
        onPressSend={(msg) => {
          Alert.alert('전송', `메시지: ${msg}`);
        }}
      />
    </View>
  );
}
