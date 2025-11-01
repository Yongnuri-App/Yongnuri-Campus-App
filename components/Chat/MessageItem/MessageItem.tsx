import type { ChatMessage } from '@/types/chat';
import React from 'react';
import { Image, Text, View } from 'react-native';
import styles from './MessageItem.styles';

type Props = {
  item: ChatMessage;
  mine?: boolean;
};

function formatTimeLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  const mm = String(m).padStart(2, '0');
  return `${ampm} ${hh}:${mm}`;
}

export default function MessageItem({ item, mine }: Props) {
  const isMine = typeof mine === 'boolean' ? mine : !!(item as any).mine;
  const timeLabel = formatTimeLabel((item as any).time);

  // ===== 이미지 메시지 =====
  if (item.type === 'image') {
    return isMine ? (
      <View style={styles.rowRight}>
        <Text style={styles.timeRight}>{timeLabel}</Text>
        <View style={styles.imageBubbleMine}>
          <Image source={{ uri: (item as any).uri }} style={styles.msgImageMine} />
        </View>
      </View>
    ) : (
      <View style={styles.rowLeft}>
        <View style={styles.avatar}>
          <Image
            source={require('../../../assets/images/yongnuri-icon-black.png')}
            style={styles.avatarIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.imageBubbleOthers}>
          <Image source={{ uri: (item as any).uri }} style={styles.msgImageOthers} />
        </View>
        <Text style={styles.timeLeft}>{timeLabel}</Text>
      </View>
    );
  }

  // ===== 텍스트 메시지 =====
  if (item.type === 'text') {
    return isMine ? (
      <View style={styles.rowRight}>
        <Text style={styles.timeRight}>{timeLabel}</Text>
        <View style={styles.bubbleMine}>
          <Text style={styles.bubbleTextMine}>{(item as any).text}</Text>
        </View>
      </View>
    ) : (
      <View style={styles.rowLeft}>
        <View style={styles.avatar}>
          <Image
            source={require('../../../assets/images/yongnuri-icon-black.png')}
            style={styles.avatarIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.bubbleOthers}>
          <Text style={styles.bubbleTextOthers}>{(item as any).text}</Text>
        </View>
        <Text style={styles.timeLeft}>{timeLabel}</Text>
      </View>
    );
  }

  // ===== 시스템 메시지 =====
  if (item.type === 'system') {
    return (
      <View style={styles.systemWrap}>
        <View style={styles.systemPill}>
          <Text style={styles.systemText}>{(item as any).text}</Text>
        </View>
      </View>
    );
  }

  return <View />;
}
