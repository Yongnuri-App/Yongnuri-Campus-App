// pages/LostAndFound/LostDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import type { RootStackScreenProps } from '../../types/navigation';
import styles from './LostDetailPage.styles';

const POSTS_KEY = 'lost_found_posts_v1';
const LIKED_MAP_KEY = 'lost_found_liked_map_v1'; // ✅ 게시글별 좋아요 여부 저장 키
const SCREEN_WIDTH = Dimensions.get('window').width;

// 저장 스키마 기준 타입
type LostPost = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
};

/** "1시간 전" 같은 상대 시간 */
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

// ✅ 간단 JSON 로더/세이버
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

// ✅ 목록의 likeCount까지 동기화
async function updatePostLikeCountInList(postId: string, nextCount: number) {
  const list = await loadJson<LostPost[]>(POSTS_KEY, []);
  const idx = list.findIndex(p => p.id === postId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], likeCount: nextCount };
    await saveJson(POSTS_KEY, list);
  }
}

export default function LostDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'LostDetail'>) {
  // 1) 파라미터
  const { id } = route.params;

  // 2) 상태
  const [item, setItem] = useState<LostPost | null>(null);
  const [index, setIndex] = useState(0);
  const [initialLiked, setInitialLiked] = useState(false); // ✅ 로컬 저장된 좋아요 여부
  const hScrollRef = useRef<ScrollView | null>(null);

  // 3) 상세 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: LostPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find((p) => p.id === id) ?? null;
        if (!mounted) return;
        setItem(found);
        if (!found) {
          Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        // ✅ 저장된 좋아요 여부 로드
        const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
        setInitialLiked(!!likedMap[id]);
      } catch (e) {
        if (!mounted) return;
        console.log('lost detail load error', e);
        Alert.alert('오류', '게시글을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigation]);

  // 4) 뱃지 라벨/스타일
  const badgeLabel = useMemo(
    () => (item?.type === 'lost' ? '분실' : '습득'),
    [item]
  );
  const isLost = item?.type === 'lost';

  // 5) 이미지 스와이프 인덱스
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  // 6) 신고
  const onPressReport = () => {
    Alert.alert('신고하기', '이 게시글을 신고하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '신고', style: 'destructive', onPress: () => Alert.alert('접수 완료', '검토 후 조치하겠습니다.') },
    ]);
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
      {/* 상단부터 본문까지 전부 스크롤 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]} // 하단바 높이만큼 여유
        showsVerticalScrollIndicator={false}
      >
        {/* ===== 상단 이미지 (390px) ===== */}
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
            {/* 아이콘 파일명은 프로젝트 자산에 맞게 조정 */}
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

          {/* 우하단: "1 / N" 인디케이터 */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {/* ===== 본문 ===== */}
        <View style={styles.body}>
          {/* 임시 프로필 */}
          <View style={styles.profileRow}>
            <View style={styles.avatar} />
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName}>채히</Text>
              <Text style={styles.profileDept}>AI학부</Text>
            </View>
          </View>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 뱃지 + 제목 */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isLost ? styles.badgeLost : styles.badgeFound]}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
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

      {/* ===== 하단 고정 바 (좋아요/메시지) ===== */}
      <DetailBottomBar
        initialLiked={initialLiked} // ✅ 로컬 저장값으로 초기화
        onToggleLike={async (liked: boolean) => {
          // ✅ 로컬 liked 맵 갱신
          const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
          likedMap[id] = liked;
          await saveJson(LIKED_MAP_KEY, likedMap);

          // ✅ likeCount 증감 (UI 즉시 반영) + 목록 동기화
          setItem(prev => {
            if (!prev) return prev;
            const nextCount = Math.max(0, (prev.likeCount ?? 0) + (liked ? 1 : -1));
            updatePostLikeCountInList(prev.id, nextCount);
            return { ...prev, likeCount: nextCount };
          });
        }}
        onPressSend={(msg: string) => {
          // TODO: 채팅 화면으로 이동 등
          Alert.alert('전송', `메시지: ${msg}`);
        }}
        // safe-area-context를 쓰지 않는다면 기기에 따라 살짝 띄워줄 수 있음
        // bottomInset={16}
      />
    </View>
  );
}
