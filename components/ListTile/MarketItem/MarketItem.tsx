import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './MarketItem.styles';

/** 상세로 보낼 게시글 id (상위에서 보유) */
interface Props {
  id: string;
  title: string;
  subtitle: string; // "환경과학대학 · 1시간 전"
  price: string;
  likeCount: number;
  image?: string;

  /** 상위에서 주입하는 눌렀을 때 동작 (상세로 이동 등) */
  onPress?: (id: string) => void;
}

export default function MarketItem({ id, title, subtitle, price, likeCount, image, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={() => onPress?.(id)}
    >
      {/* 왼쪽 썸네일 */}
      <Image
        source={{ uri: image }}
        style={styles.thumbnail}
      />

      {/* 오른쪽 텍스트 블럭 */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
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
    </TouchableOpacity>
  );
}
