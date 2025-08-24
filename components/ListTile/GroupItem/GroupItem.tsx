// components/ListTile/GroupItem/GroupItem.tsx
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './GroupItem.styles';

type Props = {
  title: string;
  timeText: string;
  recruitMode: 'unlimited' | 'limited';
  recruitCount: number | null;
  image?: string;
  isClosed?: boolean; // 모집완료 여부
  likeCount?: number; // ✅ 하트 카운트
  onPress?: () => void;
  bottomTag?: string; // ✅ 추가
};

export default function GroupItem({
  title,
  timeText,
  recruitMode,
  recruitCount,
  image,
  isClosed = false,
  likeCount = 0,   // ✅ 기본값 0
  onPress,
  bottomTag,
}: Props) {
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
          {/* 상태 배지 */}
          <View
            style={[
              styles.badge,
              isClosed ? styles.badgeClosed : styles.badgeActive,
            ]}
          >
            <Text style={styles.badgeText}>{isClosed ? '모집완료' : '모집중'}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* 모집 인원 */}
        <Text style={styles.recruitLine}>
          모집 인원 - {recruitMode === 'unlimited' ? '제한 없음' : `${recruitCount ?? 0}명`}
        </Text>

        {/* 시간 */}
        <Text style={styles.timeText}>{timeText}</Text>
      </View>

      {/* 좋아요 영역 */}
      <View style={styles.likeWrap}>
        <Image
          source={require('../../../assets/images/grayheart.png')}
          style={styles.likeIcon}
          resizeMode="contain"
        />
        <Text style={styles.likeCount}>{likeCount}</Text>
      </View>

      {/* 카드 하단 태그 (검색 결과 등에서 표시) */}
      {bottomTag ? (
        <View pointerEvents="none" style={styles.bottomTagBox}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
