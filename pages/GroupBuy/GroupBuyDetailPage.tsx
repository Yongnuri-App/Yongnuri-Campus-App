// pages/GroupBuy/GroupBuyDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
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
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';
import ProfileRow from '../../components/Profile/ProfileRow';
import { useDeletePost } from '../../hooks/useDeletePost';
import { useLike } from '../../hooks/useLike';
import usePermissions from '../../hooks/usePermissions';
import AdminActionSheet from '../../components/Modals/AdminActionSheet/AdminActionSheet';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './GroupBuyDetailPage.styles';
import useDisplayProfile from '../../hooks/useDisplayProfile';

const POSTS_KEY = 'groupbuy_posts_v1';
const LIKED_MAP_KEY = 'groupbuy_liked_map_v1';
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

export default function GroupBuyDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'GroupBuyDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<GroupBuyPost | null>(null);
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

  // 최초 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find((p) => String(p.id) === String(id)) ?? null;
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

  // 수정 후 복귀 시 리로드
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(POSTS_KEY);
          const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
          const found = list.find((p) => String(p.id) === String(id)) ?? null;
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

  // 권한 파생
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  const timeText = useMemo(() => (item ? timeAgo(item.createdAt) : ''), [item]);

  // ✅ 이메일 기반 최신 프로필 표기
  const { name: lookupName, dept: lookupDept } = useDisplayProfile(item?.authorEmail ?? null, true);
  const profileName = useMemo(
    () => (lookupName || item?.authorName || '사용자'),
    [lookupName, item?.authorName]
  );
  const profileDept = useMemo(
    () => (lookupDept || item?.authorDept || ''),
    [lookupDept, item?.authorDept]
  );

  const recruitLabel =
    item?.recruit?.mode === 'unlimited' ? '제한 없음' : `${item?.recruit?.count ?? 0}명`;
  const currentCount = 0; // TODO: API 연동 시 실제 현재 인원으로 대체

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  const onPressReport = () => {
    const targetLabel = `${profileDept || '학부 미설정'} - ${profileName}`;
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
  const thumbUri = images.length > 0 ? images[0] : undefined;
  const recruitText = `현재 모집 인원 ${currentCount}명 (${recruitLabel})`;

  // 우상단 버튼
  const RightTopButton = () =>
    isAdmin || isOwner ? (
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

          <Text style={styles.recruitLine}>{recruitText}</Text>

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

      {/* ===== 하단 바 ===== */}
      {!isOwner && (
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
          chatAutoNavigateParams={{
            source: 'groupbuy',
            postId: id,
            authorNickname: profileName,
            postTitle: item.title,
            recruitLabel: recruitText,
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
