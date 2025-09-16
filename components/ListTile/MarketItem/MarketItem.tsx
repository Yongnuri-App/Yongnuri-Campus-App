// components/ListTile/MarketItem/MarketItem.tsx
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './MarketItem.styles';

// ✅ 타이틀 앞에 붙일 배지 (예약중/거래완료만 표시, 판매중은 표시 X)
import SaleStatusBadge from '@/components/Badge/SaleStatusBadge';

/** 상세로 보낼 게시글 id (상위에서 보유) */
interface Props {
  id: string;
  title: string;
  subtitle: string; // "환경과학대학 · 1시간 전"
  price: string;
  likeCount?: number;        // ✅ 선택값으로 변경
  image?: string;
  bottomTag?: string;        // ✅ 추가

  /** ✅ 메인 리스트에서 타이틀 앞에 붙일 판매 상태 (판매중/예약중/거래완료) */
  saleStatus?: '판매중' | '예약중' | '거래완료';

  /** 상위에서 주입하는 눌렀을 때 동작 (상세로 이동 등) */
  onPress?: (id: string) => void;
}

/**
 * MarketItem
 * - 메인 리스트 카드 한 줄
 * - 타이틀 앞에 SaleStatusBadge를 붙인다 (판매중은 표시 X, 예약중/거래완료만)
 * - SearchPage 등에서만 bottomTag가 내려오면 하단에 태그 박스가 렌더링됨
 */
export default function MarketItem({
  id,
  title,
  subtitle,
  price,
  likeCount = 0,            // ✅ 기본값 0
  image,
  onPress,
  bottomTag,                // ✅ 수신
  saleStatus,               // ✅ 수신 (옵션)
}: Props) {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}  // ✅ 변경: 0.8 → 0.85
      onPress={() => onPress?.(id)}
    >
      {/* 왼쪽 썸네일: 이미지가 있을 때만 렌더링 (uri undefined 경고 방지) */}
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} />
      ) : null}

      {/* 오른쪽 텍스트 블럭 */}
      <View style={styles.info}>
        {/* ✅ 타이틀 줄: 배지 + 타이틀 나란히 */}
        {/* styles.titleRow 가 없으면 styles 파일에 추가해주세요. */}
        <View style={styles.titleRow}>
          {/* ✅ 타입 에러 해결: undefined 방지 위해 기본값 '판매중' 강제 */}
          {/*    SaleStatusBadge 내부에서 '판매중'은 렌더링하지 않으므로 UI 영향 없음 */}
          <SaleStatusBadge status={saleStatus ?? '판매중'} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.price}>{price}</Text>
      </View>

      {/* 좋아요 영역 */}
      <View style={styles.likeWrap}>
        <Image
          source={require('../../../assets/images/grayheart.png')}
          style={styles.likeIcon}
        />
        <Text style={styles.likeCount}>{likeCount}</Text>
      </View>

      {/* ✅ 아이템 내부 하단 배지 (SearchPage 등에서만 bottomTag 전달 시 표시) */}
      {bottomTag ? (
        <View style={styles.bottomTagBox}>
          <Text style={styles.bottomTagText}>{bottomTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
