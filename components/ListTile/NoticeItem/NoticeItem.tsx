// /components/Notice/NoticeItem.tsx
import React, { useMemo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './NoticeItem.styles';

// ✅ 기존 axios client 기반 유틸 (상대경로 → 절대경로)
import { toAbsoluteUrl } from '@/api/url';

type Props = {
  id: string;
  title: string;
  termText: string;      // "2025-03-01 ~ 2025-07-31"
  timeAgoText: string;   // "34분 전"
  status: 'open' | 'closed';
  image?: string;        // 서버가 준 썸네일 경로(/uploads/.., images/.., http.. 다 허용)
  bottomTag?: string;
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
  bottomTag,
}: Props) {
  // ✅ 상대/절대 어떤 형태가 와도 절대 URL로 통일
  const thumbUri = useMemo(() => toAbsoluteUrl(image ?? ''), [image]);

  const badgeText = status === 'closed' ? '모집마감' : '모집중';
  const badgeStyle = status === 'closed' ? styles.badgeClosed : styles.badgeOpen;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onPress={() => onPress?.(id)}
    >
      {/* 왼쪽 썸네일: 이미지 있으면 표시, 없으면 플레이스홀더 */}
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={styles.thumbnail}
          // ❗ 필요 시 인증 헤더를 써야 한다면 axios 대신 expo-image 또는 fetch 기반으로 교체 필요
          onError={(e) => {
            console.warn('[NoticeItem] image load error:', thumbUri, e?.nativeEvent?.error);
          }}
        />
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

      {/* 하단 배지(검색 결과에서만) */}
      {bottomTag ? (
        <View className="bottomTagBox" style={styles.bottomTagBox}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
