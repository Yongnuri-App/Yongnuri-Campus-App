// pages/GroupBuy/GroupBuyDetailPage.tsx
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
import DetailBottomBar from '../../components/Bottom/DetailBottomBar';
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './GroupBuyDetailPage.styles';

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

  // ✅ 작성자 정보(선택): 있으면 사용, 없으면 화면에 임시 텍스트
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

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
async function saveJson<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function updatePostLikeCountInList(postId: string, nextCount: number) {
  const raw = await AsyncStorage.getItem(POSTS_KEY);
  const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
  const idx = list.findIndex(p => p.id === postId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], likeCount: nextCount };
    await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));
  }
}

export default function GroupBuyDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'GroupBuyDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<GroupBuyPost | null>(null);
  const [index, setIndex] = useState(0);
  const [initialLiked, setInitialLiked] = useState(false);

  const hScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: GroupBuyPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find(p => p.id === id) ?? null;
        if (!mounted) return;
        setItem(found);

        if (!found) {
          Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        // ✅ 좋아요(하트) 상태 로드
        const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
        setInitialLiked(!!likedMap[id]);
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
  }, [id, navigation]);

  const timeText = useMemo(() => (item ? timeAgo(item.createdAt) : ''), [item]);

  // ✅ 화면에 표시할 프로필 텍스트 (데이터 없으면 임시값)
  const profileName = item?.authorName ?? '채히';
  const profileDept = item?.authorDept ?? 'AI학부';

  // 괄호에는 모집 한도(제한 없음 / n명) 표시
  const recruitLabel =
    item?.recruit?.mode === 'unlimited'
      ? '제한 없음'
      : `${item?.recruit?.count ?? 0}명`;

  // 현재 인원은 아직 미연동 → 0 고정
  const currentCount = 0;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  // ✅ 신고 페이지로 이동: 상세에 표시 중인 이름/학부로 라벨 생성
  const onPressReport = () => {
    const targetLabel = `${profileDept} - ${profileName}`;
    navigation.navigate('Report', { targetLabel });
  };

  const onPressApply = () => {
    if (!item?.applyLink) {
      Alert.alert('안내', '신청 링크가 없습니다.');
      return;
    }
    const url = /^https?:\/\//i.test(item.applyLink) ? item.applyLink : `https://${item.applyLink}`;
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

          {/* 우상단: 신고하기 */}
          <TouchableOpacity
            style={[styles.iconBtn, styles.iconRightTop]}
            onPress={onPressReport}
            accessibilityRole="button"
            accessibilityLabel="신고하기"
            activeOpacity={0.9}
          >
            <Image source={require('../../assets/images/alert_white.png')} style={styles.icon} />
          </TouchableOpacity>

          {/* 우하단: 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {/* ===== 본문 ===== */}
        <View style={styles.body}>
          {/* 프로필 */}
          <View style={styles.profileRow}>
            <View style={styles.avatar} />
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName}>{profileName}</Text>
              <Text style={styles.profileDept}>{profileDept}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 제목 + 신청 버튼 */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

            <TouchableOpacity
              style={styles.applyBtn}
              activeOpacity={0.9}
              onPress={onPressApply}
            >
              <Text style={styles.applyBtnText}>신청</Text>
            </TouchableOpacity>
          </View>

          {/* 모집 인원 라인 */}
          <Text style={styles.recruitLine}>
            현재 모집 인원 {currentCount}명 ({recruitLabel})
          </Text>

          {/* 시간 */}
          <Text style={styles.time}>{timeText}</Text>

          {/* 설명 카드 */}
          <View style={styles.descCard}>
            <Text style={styles.descText}>{item.description}</Text>
          </View>

          {/* 신청 링크 */}
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

      {/* ===== 하단 고정 바: 좋아요 유지 ===== */}
      <DetailBottomBar
        initialLiked={initialLiked}
        onToggleLike={async (liked) => {
          const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
          likedMap[id] = liked;
          await saveJson(LIKED_MAP_KEY, likedMap);

          setItem(prev => {
            if (!prev) return prev;
            const nextCount = Math.max(0, (prev.likeCount ?? 0) + (liked ? 1 : -1));
            updatePostLikeCountInList(prev.id, nextCount);
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
