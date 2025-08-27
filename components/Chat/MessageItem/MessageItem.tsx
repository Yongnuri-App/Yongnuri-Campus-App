// /src/components/Chat/MessageItem/MessageItem.tsx
import type { ChatMessage } from '@/types/chat';
import React from 'react';
import { Image, Text, View } from 'react-native';
import styles from './MessageItem.styles';

type Props = { item: ChatMessage };

export default function MessageItem({ item }: Props) {
  const isMine = !!item.mine;

  if (item.type === 'image') {
    return isMine ? (
      <View style={styles.rowRight}>
        <Text style={styles.timeRight}>{item.time}</Text>
        <View style={styles.imageBubbleMine}>
          <Image source={{ uri: item.uri }} style={styles.msgImageMine} />
        </View>
      </View>
    ) : (
      <View style={styles.rowLeft}>
        <View style={styles.avatar} />
        <View style={styles.imageBubbleOthers}>
          <Image source={{ uri: item.uri }} style={styles.msgImageOthers} />
        </View>
        <Text style={styles.timeLeft}>{item.time}</Text>
      </View>
    );
  }

  if (item.type === 'text') {
    return isMine ? (
      <View style={styles.rowRight}>
        <Text style={styles.timeRight}>{item.time}</Text>
        <View style={styles.bubbleMine}>
          <Text style={styles.bubbleTextMine}>{item.text}</Text>
        </View>
      </View>
    ) : (
      <View style={styles.rowLeft}>
        <View style={styles.avatar} />
        <View style={styles.bubbleOthers}>
          <Text style={styles.bubbleTextOthers}>{item.text}</Text>
        </View>
        <Text style={styles.timeLeft}>{item.time}</Text>
      </View>
    );
  }

  // 🔒 절대 undefined 반환하지 않도록 안전 처리
  return null;
}
