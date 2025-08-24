// components/ListTile/LostItem/LostItem.tsx
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './LostItem.styles';

type Props = {
  title: string;
  subtitle: string;     // 예: "무도대학 · 1시간 전"
  typeLabel: '분실' | '습득';
  likeCount?: number;
  image?: string;
  onPress?: () => void;
  bottomTag?: string;   // ✅ 추가
};

export default function LostItem({
  title,
  subtitle,
  typeLabel,
  likeCount = 0,
  image,
  onPress,
  bottomTag,
}: Props) {
  const isLost = typeLabel === '분실';
  const badgeStyle = isLost ? styles.badgeLost : styles.badgeFound;

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={onPress}>
      {/* 썸네일 */}
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, { backgroundColor: '#D9D9D9' }]} />
      )}

      {/* 텍스트 블록 */}
      <View style={styles.info}>
        {/* 뱃지 + 제목 */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={styles.badgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* 좋아요 영역 ✅ */}
      <View style={styles.likeWrap}>
        <Image
          source={require('../../../assets/images/grayheart.png')}
          style={styles.likeIcon}
        />
        <Text style={styles.likeCount}>{likeCount}</Text>
      </View>

      {/* ✅ 카드 내부 하단 배지 */}
      {bottomTag ? (
        <View pointerEvents="none" style={styles.bottomTagBox}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
