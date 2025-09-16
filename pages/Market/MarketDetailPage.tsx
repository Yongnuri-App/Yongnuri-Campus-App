// pages/Market/MarketDetailPage.tsx
import DetailBottomBar from '@/components/Bottom/DetailBottomBar';
import AdminActionSheet from '@/components/Modals/AdminActionSheet/AdminActionSheet';
import ProfileRow from '@/components/Profile/ProfileRow';
import { useDeletePost } from '@/hooks/useDeletePost';
import { useLike } from '@/hooks/useLike';
import usePermissions from '@/hooks/usePermissions';
import { updatePostLikeCountInList } from '@/repositories/marketRepo';
import { upsertRoomOnOpen } from '@/storage/chatStore';
import type { ChatCategory } from '@/types/chat';
import type { RootStackScreenProps } from '@/types/navigation';
import { getProfileByEmail, toDisplayName } from '@/utils/session'; // ✅ 이메일 기반 프로필 조회/표시 유틸
import { loadJson, saveJson } from '@/utils/storage';
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
import styles from './MarketDetailPage.styles';

/** AsyncStorage 키 상수 */
const POSTS_KEY = 'market_posts_v1';
const LIKED_MAP_KEY = 'market_liked_map_v1';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** 마켓 게시글 타입 (로컬 드래프트/모킹 데이터 기준) */
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

  /** ✅ 작성자 메타(판매자 판별/표시용) */
  authorId?: string | number;
  authorEmail?: string | null;
  authorName?: string;
  authorDept?: string;

  /** ✅ (선택) 판매 상태: 있으면 채팅 초깃값으로 전달 */
  status?: 'ON_SALE' | 'RESERVED' | 'SOLD';
};

/** "n분 전" 표기 헬퍼 */
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

/**
 * MarketDetailPage
 * - 상세 정보 표시
 * - 좋아요 토글
 * - 신고/관리자 액션
 * - 채팅 진입(하단 바/DEV 버튼)
 */
export default function MarketDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'MarketDetail'>) {
  const { id } = route.params;

  const [item, setItem] = useState<MarketPost | null>(null);
  const [index, setIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const hScrollRef = useRef<ScrollView | null>(null);

  /** ✅ 상세 로드 */
  const loadItem = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list: MarketPost[] = raw ? JSON.parse(raw) : [];
      const found = list.find(p => String(p.id) === String(id)) ?? null;

      setItem(found);
      if (!found) {
        Alert.alert('알림', '해당 게시글을 찾을 수 없어요.', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      // 좋아요 카운트 동기화
      syncCount(found.likeCount ?? 0);
    } catch (e) {
      console.log('market detail load error', e);
      Alert.alert('오류', '게시글을 불러오지 못했어요.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    }
  }, [id, navigation]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => loadItem());
    return unsub;
  }, [navigation, loadItem]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  /** 좋아요 훅 */
  const { liked, syncCount } = useLike({
    itemId: id,
    likedMapKey: LIKED_MAP_KEY,
    postsKey: POSTS_KEY,
    initialCount: 0,
  });

  /** 삭제 훅 */
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

  /** 권한 파생: 관리자/소유자 */
  const { isAdmin, isOwner } = usePermissions({
    authorId: item?.authorId,
    authorEmail: item?.authorEmail ?? null,
    routeParams: route.params,
  });

  /**
   * ✅ 닉네임/학과 표시 상태
   * - 이메일 기반 프로필 조회 → (없으면) authorName/authorDept → (그래도 없으면) '익명'
   * - 한 번 계산한 값을 화면/신고/채팅 파라미터에서 일관되게 사용
   */
  const [authorNickname, setAuthorNickname] = useState<string>('익명');
  const [authorDeptLabel, setAuthorDeptLabel] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!item) return;

      // 1) 이메일로 프로필 조회(최신 표준)
      if (item.authorEmail) {
        try {
          const prof = await getProfileByEmail(item.authorEmail);
          if (prof) {
            const nick =
              toDisplayName({ name: prof.name, nickname: prof.nickname }, true) ||
              item.authorName ||
              '익명';
            setAuthorNickname(nick);
            setAuthorDeptLabel(prof.department || item.authorDept || '');
            return;
          }
        } catch (e) {
          console.log('profile lookup failed:', e);
        }
      }

      // 2) 이메일 프로필 없거나 실패 → 과거 메타로 폴백
      const nick = item.authorName || '익명';
      setAuthorNickname(nick);
      setAuthorDeptLabel(item.authorDept || '');
    })();
  }, [item]);

  /** 가격 표기 */
  const priceDisplay = useMemo(() => {
    if (!item) return '';
    return item.mode === 'donate'
      ? '나눔'
      : `₩ ${Number(item.price ?? 0).toLocaleString('ko-KR')}`;
  }, [item]);

  /** 이미지 인덱스 업데이트 */
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  /** 신고 화면으로 이동 */
  const onPressReport = () => {
    navigation.navigate('Report', {
      targetNickname: authorNickname,
      targetDept: authorDeptLabel || undefined,
      targetEmail: item?.authorEmail ?? null,
    });
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
  const RightTopButton = () => {
    if (isAdmin || isOwner) {
      return (
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconRightTop]}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="게시글 옵션"
          activeOpacity={0.9}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image source={require('@/assets/images/more_white.png')} style={styles.icon} />
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
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Image source={require('@/assets/images/alert_white.png')} style={styles.icon} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ===== 상단 이미지 영역 ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={require('@/assets/images/back_white.png')} style={styles.icon} />
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
          {/* ✅ 이메일 기반 최신 프로필 표시 + 폴백 */}
          <ProfileRow
            emailForLookup={item.authorEmail ?? null}
            preferNickname
            fallbackName={authorNickname}
            fallbackDept={authorDeptLabel || ' '}
          />

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

      {/* ✅ DEV: 판매자 강제 채팅 진입 버튼 (배포 제외) */}
      {__DEV__ && isOwner && (
        <TouchableOpacity
          style={styles.devOpenChatBtn}
          onPress={async () => {
            // 1) 방 메타 구성
            const category: ChatCategory = 'market';
            const nickname = authorNickname; // ✅ 통일된 닉네임 사용
            const roomId = `market-${String(item.id)}-${nickname}`;
            const productTitle = item.title;
            const productPrice = item.mode === 'donate' ? 0 : Number(item.price ?? 0);
            const productImageUri =
              Array.isArray(images) && images.length > 0 ? images[0] : undefined;

            // 2) ChatList에 즉시 보이도록 upsert
            const preview = 'DEV: 판매자 진입 테스트'; // 리스트 미리보기 문구
            await upsertRoomOnOpen({
              roomId,
              category,
              nickname, // ✅ 리스트 카드에 노출될 닉네임
              productTitle,
              productPrice,
              productImageUri,
              preview,
              origin: {
                source: 'market',
                params: {
                  source: 'market',
                  postId: String(item.id),
                  sellerNickname: nickname, // ✅ 정식 키
                  // ⬇️ 백워드 호환(과거 코드가 nickname 키를 읽는 경우)
                  // @ts-expect-error - compatibility field for legacy ChatRoom code
                  nickname,

                  productTitle,
                  productPrice,
                  productImageUri,

                  // ✅ 판매자 판별 메타
                  authorId: item.authorId,
                  authorEmail: item.authorEmail ?? null,

                  // ✅ 초기 판매상태
                  initialSaleStatus: item.status ?? 'ON_SALE',

                  // (선택) ChatRoom 최초 전송 시딩
                  initialMessage: preview,
                },
              },
            });

            // 3) ChatRoom으로 이동 (원본 파라미터 그대로)
            navigation.navigate('ChatRoom', {
              source: 'market',
              postId: String(item.id),
              sellerNickname: nickname, // ✅ 정식 키
              // ⬇️ 백워드 호환: 과거 코드에서 nickname만 읽는 경우 대비
              // @ts-expect-error - compatibility field for legacy ChatRoom code
              nickname,

              productTitle,
              productPrice,
              productImageUri,
              authorId: item.authorId,
              authorEmail: item.authorEmail ?? null,
              initialSaleStatus: item.status ?? 'ON_SALE',
              initialMessage: preview,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="DEV: 채팅 열기(판매자)"
          activeOpacity={0.9}
        >
          <Text style={styles.devOpenChatText}>DEV: 채팅 열기(판매자)</Text>
        </TouchableOpacity>
      )}

      {/* ===== 하단 고정 바 ===== */}
      {/* ✅ 작성자 본인이라면 상세에서 채팅 시작을 숨김 */}
      {!isOwner && (
        <DetailBottomBar
          variant="detail"
          initialLiked={liked}
          onToggleLike={async (likedFlag) => {
            // ✅ 좋아요 로컬 동기화
            const likedMap = await loadJson<Record<string, boolean>>(LIKED_MAP_KEY, {});
            likedMap[id] = likedFlag;
            await saveJson(LIKED_MAP_KEY, likedMap);

            setItem((prev) => {
              if (!prev) return prev;
              const nextCount = Math.max(0, (prev.likeCount ?? 0) + (likedFlag ? 1 : -1));
              updatePostLikeCountInList(POSTS_KEY, prev.id, nextCount);
              return { ...prev, likeCount: nextCount };
            });
          }}
          /** ✅ ChatRoom으로 넘어갈 때 작성자 메타 + 초기 판매상태를 함께 전달 */
          chatAutoNavigateParams={{
            source: 'market',
            postId: String(item.id),
            sellerNickname: authorNickname, // ✅ 통일된 닉네임
            // ⬇️ 백워드 호환: 과거 ChatRoom 코드 대비
            // @ts-expect-error - compatibility field for legacy ChatRoom code
            nickname: authorNickname,

            productTitle: item.title,
            productPrice: item.mode === 'donate' ? 0 : Number(item.price ?? 0),
            productImageUri: Array.isArray(images) && images.length > 0 ? images[0] : undefined,

            // ✅ 판매자 판별용 메타
            authorId: item.authorId,
            authorEmail: item.authorEmail ?? null,

            // ✅ 판매상태 초기값(선택)
            initialSaleStatus: item.status ?? 'ON_SALE',
          }}
        />
      )}

      {/* ✅ 관리자/판매자 공통 옵션 모달 */}
      {(isAdmin || isOwner) && (
        <AdminActionSheet
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          showEdit={!isAdmin && isOwner}
          onEdit={() => navigation.navigate('SellItem', { mode: 'edit', id })}
          onDelete={confirmAndDelete}
          editLabel="수정"
          deleteLabel="삭제"
        />
      )}
    </View>
  );
}
