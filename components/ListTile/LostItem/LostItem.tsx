// components/ListTile/LostItem/LostItem.tsx
// ------------------------------------------------------
// 변경 요약
// - typeLabel 타입에 '회수' 추가
// - 배지 스타일 계산 로직 통일 (분실/습득/회수)
// - styles.badgeRetrieved가 없어도 폴백 색(#EAF7EA)로 안전 동작
// - 주석 보강
// ------------------------------------------------------

import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './LostItem.styles';

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

    // '회수' 케이스
    const retrieved =
      styles.badgeRetrieved ?? { backgroundColor: '#979797' };
    return retrieved;
  };

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

      {/* 카드 내부 하단 배지(선택) */}
      {bottomTag ? (
        <View pointerEvents="none" style={styles.bottomTagBox}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
