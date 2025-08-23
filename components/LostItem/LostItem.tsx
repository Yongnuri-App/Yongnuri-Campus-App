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
};

export default function LostItem({
  title,
  subtitle,
  typeLabel,
  likeCount = 0,
  image,
  onPress,
}: Props) {
  // ✅ 타입별 색상 적용
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
        {/* 뱃지 + 제목 한 줄 */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={styles.badgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}
