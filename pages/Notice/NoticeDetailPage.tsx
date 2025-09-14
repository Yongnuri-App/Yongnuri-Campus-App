// pages/Notice/NoticeDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import usePermissions from '../../hooks/usePermissions';
import AdminActionSheet from '../../components/Modals/AdminActionSheet/AdminActionSheet';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './NoticeDetailPage.styles';

const POSTS_KEY = 'notice_posts_v1';
const LIKED_MAP_KEY = 'notice_liked_map_v1';
const SCREEN_WIDTH = Dimensions.get('window').width;

type StoredNotice = {
  id: string;
  title: string;
  description: string;
  images?: string[];
  startDate?: string;     // ISO
  endDate?: string;       // ISO
  createdAt?: string;     // ISO
  applyUrl?: string | null;
  likeCount?: number;
  authorName?: string;
  authorDept?: string;
};

function ymd(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
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

/** 저장소 → UI 파생 모델 */
function toUi(raw: StoredNotice) {
  const startIso = raw.startDate ?? raw.createdAt ?? new Date().toISOString();
  const endIso = raw.endDate ?? raw.startDate ?? raw.createdAt ?? startIso;
  const images = Array.isArray(raw.images) ? raw.images : [];
  const open = new Date(endIso).getTime() >= Date.now();

  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    images,
    likeCount: Number(raw.likeCount ?? 0),
    termText: `${ymd(startIso)} ~ ${ymd(endIso)}`,
    timeAgoText: timeAgo(raw.createdAt ?? startIso),
    status: open ? ('open' as const) : ('closed' as const),
    link: raw.applyUrl ?? undefined,
    authorName: raw.authorName ?? '운영자',
    authorDept: raw.authorDept ?? '관리자',
    createdAt: raw.createdAt,
  };
}

export default function NoticeDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'NoticeDetail'>) {
  const { id } = route.params;

  /** 좋아요 훅 (syncCount를 load 내부에서 호출하므로 먼저 선언) */
  const { liked, syncCount, setLikedPersisted } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
  });

  /** 공지는 “관리자만 수정/삭제” 정책 → author 정보 없이도 OK */
  const { isAdmin } = usePermissions({ routeParams: route.params });

  /** 글 로드 */
  const [post, setPost] = useState<StoredNotice | null>(null);
  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list: StoredNotice[] = raw ? JSON.parse(raw) : [];
      const found = list.find(p => p.id === id) ?? null;
      if (!found) {
        Alert.alert('알림', '해당 공지를 찾을 수 없어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setPost(found);
      syncCount(found.likeCount ?? 0);
    } catch {
      Alert.alert('오류', '공지사항을 불러오지 못했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    }
  }, [id, navigation, syncCount]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  /** 삭제 훅 */
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

  const ui = useMemo(() => (post ? toUi(post) : null), [post]);

  /** 이미지 슬라이드 */
  const [index, setIndex] = useState(0);
  const hScrollRef = useRef<ScrollView | null>(null);
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 관리자 모달 상태 */
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);

  /** 링크 열기 */
  const onPressOpenLink = useCallback(() => {
    if (!ui?.link) return;
    const url = /^https?:\/\//i.test(ui.link) ? ui.link : `https://${ui.link}`;
    Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
  }, [ui?.link]);

  if (!ui) {
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
              onPress={() => setAdminMenuVisible(true)}
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

            {/* 우측 하트 */}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={() => setLikedPersisted(!liked)}
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

          {/* 기간 / 등록시점 */}
          {!!ui.termText && <Text style={styles.term} numberOfLines={1}>{ui.termText}</Text>}
          {!!ui.timeAgoText && <Text style={styles.timeAgo}>{ui.timeAgoText}</Text>}

          {/* 본문 */}
          {!!ui.description && (
            <View style={styles.descCard}>
              <Text style={styles.descText}>{ui.description}</Text>
            </View>
          )}

          {/* 신청 링크 */}
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
