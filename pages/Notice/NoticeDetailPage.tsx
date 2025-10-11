// pages/Notice/NoticeDetailPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// ✅ 서버 API 연결
import {
  deleteNotice,
  getNoticeDetail,
  type NoticeResponse,
} from '../../api/notices';

const LIKED_MAP_KEY = 'notice_liked_map_v1';
const SCREEN_WIDTH = Dimensions.get('window').width;

/** 서버 응답(NoticeResponse) → 화면에서 쓰기 편한 UI 모델로 변환 */
function toUi(raw: NoticeResponse) {
  // 이미지 배열: 서버 ImageDto가 { imageUrl } 또는 { url }일 수 있어 유연 파싱
  const imageUrls =
    Array.isArray((raw as any).images)
      ? (raw as any).images
          .map((it: any) => it?.imageUrl ?? it?.url ?? null)
          .filter(Boolean)
      : [];

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

  // 상태: 서버 status(ENUM)와 기간 기준을 함께 고려
  const isClosedEnum = raw.status === 'COMPLETED' || raw.status === 'DELETED';
  const isClosedTime = endIso ? new Date(endIso).getTime() < Date.now() : false;
  const status = isClosedEnum || isClosedTime ? ('closed' as const) : ('open' as const);

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
    authorDept: '관리자', // 서버에 부서가 없으므로 고정 표기
    createdAt: raw.createdAt,
  };
}

export default function NoticeDetailPage({
  route,
  navigation,
}: RootStackScreenProps<'NoticeDetail'>) {
  const { id } = route.params;

  // ✅ 공지는 “관리자만 수정/삭제”
  const { isAdmin } = usePermissions({ routeParams: route.params });

  // 서버에서 불러온 상세 데이터
  const [data, setData] = useState<NoticeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 좋아요(로컬 맵 기반 토글)
  const [liked, setLiked] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      // 1) 상세 조회
      const res = await getNoticeDetail(id);

      // 2) 로컬 좋아요 맵에서 현재 글의 liked 상태 복원
      const rawMap = await AsyncStorage.getItem(LIKED_MAP_KEY);
      const map = rawMap ? (JSON.parse(rawMap) as Record<string, boolean>) : {};
      setLiked(!!map[String(res.id)]);

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

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      // 목록 → 상세 재진입 시 최신화
      load();
    }, [load])
  );

  // 삭제(관리자 전용): 서버로 삭제 후 뒤로 이동
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

  // UI 파생 모델
  const ui = useMemo(() => (data ? toUi(data) : null), [data]);

  // 이미지 슬라이드
  const [index, setIndex] = useState(0);
  const hScrollRef = useRef<ScrollView | null>(null);
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  };

  // 관리자 모달
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);

  // 링크 열기
  const onPressOpenLink = useCallback(() => {
    if (!ui?.link) return;
    const url = /^https?:\/\//i.test(ui.link) ? ui.link : `https://${ui.link}`;
    Linking.openURL(url).catch(() => Alert.alert('오류', '링크를 열 수 없습니다.'));
  }, [ui?.link]);

  // 좋아요 토글 (로컬 맵만 반영)
  const toggleLike = useCallback(async () => {
    try {
      const key = String(id);
      const rawMap = await AsyncStorage.getItem(LIKED_MAP_KEY);
      const map = rawMap ? (JSON.parse(rawMap) as Record<string, boolean>) : {};
      const next = !map[key];
      map[key] = next;
      await AsyncStorage.setItem(LIKED_MAP_KEY, JSON.stringify(map));
      setLiked(next);
    } catch {
      // 무시 (UI만 토글 실패 시 조용히)
    }
  }, [id]);

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

            {/* 우측 하트 (로컬 좋아요) */}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={toggleLike}
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
