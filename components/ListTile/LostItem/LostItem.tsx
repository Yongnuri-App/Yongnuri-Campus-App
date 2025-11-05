// components/ListTile/LostItem/LostItem.tsx
// ------------------------------------------------------
// 변경 요약
// - 이미지가 없으면 썸네일을 렌더링하지 않음(마켓 아이템과 동일 UX)
// - bottomTag 위치를 썸네일 유무에 따라 동적으로 계산
// - '회수' 배지 폴백 색 유지
// ------------------------------------------------------

import { toAbsoluteUrl } from '@/api/url';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles, { GAP, THUMB } from './LostItem.styles';

type Props = {
  title: string;
  /** 예: "무도대학 · 1시간 전" */
  subtitle: string;
  /** 카드 상단 배지 라벨 */
  typeLabel: '분실' | '습득' | '회수';
  likeCount?: number;
  image?: string;
  onPress?: () => void;
  /** 카드 내부 하단에 작게 붙는 태그 (선택) */
  bottomTag?: string;
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
  // ✅ 배지 배경 스타일 계산: styles에 badgeRetrieved가 없으면 폴백 색상 사용
  const getBadgeBgStyle = () => {
    if (typeLabel === '분실') return styles.badgeLost;
    if (typeLabel === '습득') return styles.badgeFound;
    return styles.badgeRetrieved ?? { backgroundColor: '#979797' };
  };

  // ✅ 이미지 URL을 절대 경로로 변환
  const thumbUri = image ? toAbsoluteUrl(image) : undefined;

  // ✅ 썸네일이 없으면 bottomTag를 텍스트 시작선(= 왼쪽)으로 맞춤
  const bottomTagLeft = thumbUri ? THUMB + GAP : 0;

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={onPress}>
      {/* 썸네일: 이미지가 있을 때만 렌더링 */}
      {thumbUri ? <Image source={{ uri: thumbUri }} style={styles.thumbnail} /> : null}

      {/* 텍스트 블록 */}
      <View style={styles.info}>
        {/* 상단: 배지 + 제목 */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.badge, getBadgeBgStyle()]}>
            <Text style={styles.badgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* 서브타이틀(장소/시간 등) */}
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* 좋아요 영역 */}
      <View style={styles.likeWrap}>
        <Image
          source={require('../../../assets/images/grayheart.png')}
          style={styles.likeIcon}
        />
        <Text style={styles.likeCount}>{likeCount}</Text>
      </View>

      {/* 카드 내부 하단 배지(선택) — 썸네일 유무에 따라 left 자동 조정 */}
      {bottomTag ? (
        <View pointerEvents="none" style={[styles.bottomTagBox, { left: bottomTagLeft }]}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
