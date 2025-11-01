// src/components/Chat/MessageList/MessageList.tsx
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, useWindowDimensions } from 'react-native';
import MessageItem from '../MessageItem/MessageItem';
import styles from './MessageList.styles';

type Props = {
  data: ChatMessage[];
  bottomInset: number;
  autoScrollOnKeyboard?: boolean;
  keyboardHeight?: number;
  onContentHeightChange?: (height: number) => void;
};

const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

const toMs = (m: any): number => {
  const t = m?.time ?? m?.ts ?? m?.createdAt ?? m?.created_at ?? m?.timestamp ?? 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Number(new Date(t));
  if (t instanceof Date) return +t;
  return 0;
};

const getKey = (msg: any, idx: number) => String(msg?.id ?? `${toMs(msg)}_${idx}`);

export default function MessageList({
  data,
  bottomInset,
  autoScrollOnKeyboard = true,
  keyboardHeight = 0,
  onContentHeightChange,
}: Props) {
  const flatRef = useRef<FlatList<ChatMessage>>(null);
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const prevLengthRef = useRef(0);
  const [contentHeight, setContentHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  
  // ✅ 애니메이션 값
  const animatedPadding = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    (async () => {
      try {
        const { userEmail, userId } = await getLocalIdentity();
        setMeEmail(userEmail ?? null);
        setMeId(userId != null ? String(userId) : null);
      } catch {
        setMeEmail(null);
        setMeId(null);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    const arr = Array.isArray(data) ? [...data] : [];
    arr.sort((a, b) => toMs(b) - toMs(a));
    return arr;
  }, [data]);

  useEffect(() => {
    if (sorted.length > prevLengthRef.current && sorted.length > 0) {
      requestAnimationFrame(() => {
        flatRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    }
    prevLengthRef.current = sorted.length;
  }, [sorted.length]);

  const isMine = (m: ChatMessage) => {
    const sEmail = (m as any).senderEmail as string | null | undefined;
    if (sEmail && meEmail) {
      if (normEmail(sEmail) === normEmail(meEmail)) return true;
    }
    const sIdRaw = (m as any).senderId as string | number | null | undefined;
    const sId = sIdRaw != null ? String(sIdRaw) : null;
    if (sId && meId) {
      if (sId === meId) return true;
    }
    return false;
  };

  // ✅ 메시지 내용이 화면을 꽉 채우는지 확인
  const needsInset = contentHeight > windowHeight * 0.3;

  // ✅ paddingTop을 부드럽게 애니메이션
  useEffect(() => {
    Animated.timing(animatedPadding, {
      toValue: needsInset ? bottomInset : 12,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [needsInset, bottomInset, animatedPadding]);

  // ✅ AnimatedFlatList 생성
  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<ChatMessage>);

  return (
    <AnimatedFlatList
      ref={flatRef}
      data={sorted}
      keyExtractor={(item, idx) => getKey(item, idx)}
      renderItem={({ item }) => <MessageItem item={item} mine={isMine(item)} />}
      inverted
      
      contentContainerStyle={[
        styles.listContent,
        { 
          flexGrow: 1,
          justifyContent: 'flex-end',
          paddingTop: animatedPadding,  // ✅ Animated 값 사용
          paddingBottom: 12,
        }
      ]}
      
      onContentSizeChange={(width, height) => {
        setContentHeight(height);
        onContentHeightChange?.(height);  // ✅ 부모로 전달
      }}
      
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={7}
      removeClippedSubviews={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
    />
  );
}