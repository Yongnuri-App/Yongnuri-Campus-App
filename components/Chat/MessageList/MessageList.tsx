// src/components/Chat/MessageList/MessageList.tsx
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
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

  // ✅ isMine 함수를 useCallback으로 메모이제이션
  const isMine = useCallback((m: ChatMessage) => {
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
  }, [meEmail, meId]);

  // ✅ renderItem을 useCallback으로 메모이제이션
  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageItem item={item} mine={isMine(item)} />,
    [isMine]
  );

  // ✅ keyExtractor를 useCallback으로
  const keyExtractor = useCallback(
    (item: ChatMessage, idx: number) => getKey(item, idx),
    []
  );

  // ✅ 메시지가 화면을 꽉 채우는지 확인 (입력창 높이 고려)
  const availableHeight = windowHeight - bottomInset - 80; // 80은 대략적인 입력창 높이
  const needsFlexEnd = contentHeight > availableHeight;

  return (
    <FlatList
      ref={flatRef}
      data={sorted}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      inverted
      
      contentContainerStyle={[
        styles.listContent,
        {
          flexGrow: 1,
          justifyContent: needsFlexEnd ? undefined : 'flex-end',  // ✅ 조건부 적용
          paddingTop: bottomInset,
          paddingBottom: 12,
        }
    ]}
      
      onContentSizeChange={(width, height) => {
        setContentHeight(height);
        onContentHeightChange?.(height);
      }}
      
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      
      // ✅ 성능 최적화 설정
      initialNumToRender={20}
      maxToRenderPerBatch={5}
      windowSize={5}
      updateCellsBatchingPeriod={100}
      removeClippedSubviews={false}  // ✅ 이미지 깜빡임 방지
      onEndReachedThreshold={0.5}
      
      // ✅ 스크롤 성능 개선
      legacyImplementation={false}
      disableVirtualization={false}
    />
  );
}