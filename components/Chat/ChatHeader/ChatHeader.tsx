// /src/components/Chat/ChatHeader/ChatHeader.tsx
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './ChatHeader.styles';

// 프로젝트 아이콘 경로에 맞게 조정하세요
const backIcon = require('@/assets/images/back.png');
const moreIcon = require('@/assets/images/more.png');

type Props = {
  /** 중앙 타이틀(상대 닉네임 등) */
  title: string;
  /** 뒤로가기 동작 */
  onPressBack: () => void;
  /** 더보기 동작(신고/차단 모달 오픈 등) */
  onPressMore?: () => void;
};

/**
 * ChatHeader
 * - 기존 ChatRoomPage.styles.ts의 헤더 스타일을 1:1 반영(절대배치)
 * - 좌측/우측 아이콘은 고정 위치, 중앙 텍스트는 실제 가로 중앙에 배치
 */
export default function ChatHeader({ title, onPressBack, onPressMore }: Props) {
  return (
    <View style={styles.header}>
      {/* 좌측: 뒤로가기 */}
      <TouchableOpacity onPress={onPressBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Image source={backIcon} style={styles.icon} />
      </TouchableOpacity>

      {/* 중앙: 타이틀 */}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      {/* 우측: 더보기 */}
      <TouchableOpacity onPress={onPressMore} style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Image source={moreIcon} style={styles.icon_more} />
      </TouchableOpacity>
    </View>
  );
}
