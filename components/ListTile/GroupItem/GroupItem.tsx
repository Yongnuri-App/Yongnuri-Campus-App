// components/ListTile/GroupItem/GroupItem.tsx
// ------------------------------------------------------
// 변경 요약
// - 자동 슬라이드(타이머/interval) 완전 제거
// - image 또는 images 배열이 내려오면 '첫 번째 한 장만' 고정 표시
// - 썸네일이 없으면 이미지 영역 미표시 (기존 UX 유지)
// - bottomTag는 썸네일 유무에 따라 left 동적 보정
// ------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles, { THUMB, GAP } from './GroupItem.styles';

type Props = {
  title: string;
  timeText: string;
  recruitMode: 'unlimited' | 'limited';
  recruitCount: number | null;
  /** 단일 이미지 URL */
  image?: string;
  /** 여러 장이 내려올 수도 있어 호환용으로 지원 (첫 장만 사용) */
  images?: string[];
  isClosed?: boolean; // 모집완료 여부
  likeCount?: number; // 하트 카운트(초깃값)
  onPress?: () => void;
  bottomTag?: string; // 검색 결과용 섹션 라벨
};

export default function GroupItem({
  title,
  timeText,
  recruitMode,
  recruitCount,
  image,
  images,
  isClosed = false,
  likeCount = 0,
  onPress,
  bottomTag,
}: Props) {
  // ✅ 첫 장만 쓰기 (자동 슬라이드 제거)
  const firstImage = useMemo(() => {
    if (image) return image;
    if (images && images.length > 0) return images[0];
    return undefined;
  }, [image, images]);

  // ✅ 로컬 카운트만 관리 (부모 값 변경 시 동기화)
  const [count, setCount] = useState<number>(likeCount ?? 0);
  const likedRef = useRef(false);

  useEffect(() => {
    setCount(likeCount ?? 0);
  }, [likeCount]);

  const onPressLike = () => {
    likedRef.current = !likedRef.current;
    setCount((c) => Math.max(0, c + (likedRef.current ? 1 : -1)));
  };

  // ✅ 썸네일 유무에 따라 bottomTag 좌표 보정
  const bottomTagLeft = firstImage ? THUMB + GAP : 0;

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={onPress}>
      {/* 썸네일: '첫 장만' 고정 표시 */}
      {firstImage ? <Image source={{ uri: firstImage }} style={styles.thumbnail} /> : null}

      {/* 텍스트 블록 */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View style={[styles.badge, isClosed ? styles.badgeClosed : styles.badgeActive]}>
            <Text style={styles.badgeText}>{isClosed ? '모집완료' : '모집중'}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        <Text style={styles.recruitLine}>
          모집 인원 - {recruitMode === 'unlimited' ? '제한 없음' : `${recruitCount ?? 0}명`}
        </Text>

        <Text style={styles.timeText}>{timeText}</Text>
      </View>

      {/* 좋아요 영역 (터치로 카운트 증감) */}
      <TouchableOpacity style={styles.likeWrap} activeOpacity={0.7} onPress={onPressLike}>
        <Image
          source={require('../../../assets/images/grayheart.png')}
          style={styles.likeIcon}
          resizeMode="contain"
        />
        <Text style={styles.likeCount}>{count}</Text>
      </TouchableOpacity>

      {/* 카드 하단 태그 — 썸네일 유무에 따라 left 자동 조정 */}
      {bottomTag ? (
        <View pointerEvents="none" style={[styles.bottomTagBox, { left: bottomTagLeft }]}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
