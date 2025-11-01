// src/components/Chat/MessageList/MessageList.tsx
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import MessageItem from '../MessageItem/MessageItem';
import styles from './MessageList.styles';

type Props = {
  data: ChatMessage[];
  bottomInset: number;
  autoScrollOnKeyboard?: boolean;
  keyboardHeight?: number;
};

const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

// 다양한 시간 필드 허용
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
}: Props) {
  const flatRef = useRef<FlatList<ChatMessage>>(null);
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

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
    arr.sort((a, b) => toMs(a) - toMs(b));
    return arr;
  }, [data]);

  useEffect(() => {
    const id = setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(id);
  }, [sorted.length]);

  useEffect(() => {
    if (!autoScrollOnKeyboard) return;
    const id = setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 10);
    return () => clearTimeout(id);
  }, [keyboardHeight, autoScrollOnKeyboard]);

  /** ✅ 좌/우 판정: mine 플래그 무시하고, (email → id) 순서만 사용 */
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

  return (
    <FlatList
      ref={flatRef}
      data={sorted}
      keyExtractor={(item, idx) => getKey(item, idx)}
      renderItem={({ item }) => <MessageItem item={item} mine={isMine(item)} />}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
      onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
      showsVerticalScrollIndicator={false}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={7}
      removeClippedSubviews={false}
    />
  );
}
