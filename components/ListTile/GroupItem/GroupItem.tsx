// components/ListTile/GroupItem/GroupItem.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './GroupItem.styles';

type Props = {
  title: string;
  timeText: string;
  recruitMode: 'unlimited' | 'limited';
  recruitCount: number | null;
  image?: string;
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
  isClosed = false,
  likeCount = 0,
  onPress,
  bottomTag,
}: Props) {
  // ✅ 로컬 카운트만 관리 (부모 값 변경 시 동기화)
  const [count, setCount] = useState<number>(likeCount ?? 0);
  // ✅ 하트 눌렀는지 내부 추적용 (리렌더 불필요 → ref로 보관)
  const likedRef = useRef(false);

  useEffect(() => {
    setCount(likeCount ?? 0);
  }, [likeCount]);

  const onPressLike = () => {
    likedRef.current = !likedRef.current;
    setCount((c) => Math.max(0, c + (likedRef.current ? 1 : -1)));
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={onPress}>
      {/* 썸네일 */}
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnail} />
      )}

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

      {/* 카드 하단 태그 */}
      {bottomTag ? (
        <View pointerEvents="none" style={styles.bottomTagBox}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
