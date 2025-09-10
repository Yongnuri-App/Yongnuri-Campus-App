import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './NoticeItem.styles';

type Props = {
  id: string;
  title: string;
  termText: string;      // "2025-03-01 ~ 2025-07-31"
  timeAgoText: string;   // "34분 전" 등
  status: 'open' | 'closed'; // 모집중 / 모집마감
  image?: string;        // ✅ 썸네일 URI (로컬 file:// 또는 http(s)://)
  onPress?: (id: string) => void;
};

export default function NoticeItem({
  id,
  title,
  termText,
  timeAgoText,
  status,
  image,
  onPress,
}: Props) {
  const badgeText = status === 'closed' ? '모집마감' : '모집중';
  const badgeStyle = status === 'closed' ? styles.badgeClosed : styles.badgeOpen;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onPress={() => onPress?.(id)}
    >
      {/* 왼쪽 썸네일: 이미지 있으면 표시, 없으면 회색 박스 */}
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbPlaceholder]} />
      )}

      {/* 오른쪽 본문 */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View style={[styles.badgeBase, badgeStyle]}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Text style={styles.term} numberOfLines={1}>
          {termText}
        </Text>

        <Text style={styles.timeAgo}>{timeAgoText}</Text>
      </View>
    </TouchableOpacity>
  );
}
