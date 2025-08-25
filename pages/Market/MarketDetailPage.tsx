// pages/Market/MarketDetailPage.tsx
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
import styles from './MarketDetailPage.styles';

const POSTS_KEY = 'market_posts_v1';
const LIKED_MAP_KEY = 'market_liked_map_v1'; // ✅ 게시글별 좋아요 여부 저장 키
const SCREEN_WIDTH = Dimensions.get('window').width;

type MarketPost = {
  id: string;
  title: string;
  description: string;
  mode: 'sell' | 'donate';
  price: number;
  location: string;
  images: string[];
  likeCount: number;
  createdAt: string; // ISO
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
  const list = await loadJson<MarketPost[]>(POSTS_KEY, []);
  const idx = list.findIndex(p => p.id === postId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], likeCount: nextCount };
    await saveJson(POSTS_KEY, list);
  }
}

export default function MarketDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'MarketDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<MarketPost | null>(null);
  const [index, setIndex] = useState(0);
  const [initialLiked, setInitialLiked] = useState(false); // ✅ 로컬 저장된 좋아요 여부
  const hScrollRef = useRef<ScrollView | null>(null);

  // ✅ 화면에 보이는 프로필 라벨 (현재 임시 하드코딩)
  const profileName = '채히';
  const profileDept = 'AI학부';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(POSTS_KEY);
        const list: MarketPost[] = raw ? JSON.parse(raw) : [];
        const found = list.find(p => p.id === id) ?? null;
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
        console.log('detail load error', e);
        Alert.alert('오류', '게시글을 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigation]);

  const priceDisplay = useMemo(() => {
    if (!item) return '';
    return item.mode === 'donate'
      ? '나눔'
      : `₩ ${Number(item.price ?? 0).toLocaleString('ko-KR')}`;
  }, [item]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  // ✅ 신고 페이지로 이동 (프로필 라벨 전달)
  const onPressReport = () => {
    const targetLabel = `${profileDept} - ${profileName}`;
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== 상단 이미지 영역 (스크롤 상단) ===== */}
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

          {/* 우하단: 인디케이터 "1 / N" */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {images.length > 0 ? `${index + 1} / ${images.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {/* ===== 본문 ===== */}
        <View style={styles.body}>
          {/* 프로필 (임시) */}
          <View style={styles.profileRow}>
            <View style={styles.avatar} />
            <View style={styles.profileTextCol}>
              <Text style={styles.profileName}>{profileName}</Text>
              <Text style={styles.profileDept}>{profileDept}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 제목/가격/시간 */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>{priceDisplay}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>

          {/* 설명 */}
          <Text style={styles.desc}>{item.description}</Text>

          {/* 거래 희망 장소 */}
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>거래 희망 장소</Text>
            <Text style={styles.locationValue}>{item.location}</Text>
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ===== 하단 고정 바 =====
        - 좋아요 토글은 기존 로직 유지
        - 전송 버튼을 누르면 채팅방으로 이동 + 필요한 파라미터 전달
      */}
      <DetailBottomBar
        variant="detail"
        initialLiked={initialLiked}
        onToggleLike={async (liked) => {
          // ✅ 로컬 liked 맵 갱신
          const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
          likedMap[id] = liked;
          await saveJson(LIKED_MAP_KEY, likedMap);

          // ✅ likeCount 증감 (UI 즉시 반영) + 목록 동기화
          setItem((prev) => {
            if (!prev) return prev;
            const nextCount = Math.max(
              0,
              (prev.likeCount ?? 0) + (liked ? 1 : -1)
            );
            updatePostLikeCountInList(prev.id, nextCount);
            return { ...prev, likeCount: nextCount };
          });
        }}  // ← 중요: 콜백 블록과 prop 둘 다 여기서 '}}'로 닫혀야 함!!
        chatAutoNavigateParams={{
          postId: item.id,
          sellerNickname: profileName,
          productTitle: item.title,
          productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
          productImageUri: images[0],
        }}
      />
    </View>
  );
}
