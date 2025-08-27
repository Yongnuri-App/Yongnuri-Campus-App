import type { ChatMessage } from '@/types/chat';
import React, { useEffect, useRef } from 'react';
import { FlatList } from 'react-native';
import MessageItem from '../MessageItem/MessageItem';
import styles from './MessageList.styles';

type Props = {
  data: ChatMessage[];
  /** 리스트 하단 여백(입력바/첨부바/키보드/세이프에어리어를 모두 포함한 최종 인셋) */
  bottomInset: number;
  /** 키보드 높이 변화에 반응해 자동 스크롤할지 */
  autoScrollOnKeyboard?: boolean;
  /** 키보드 높이값(옵션: autoScrollOnKeyboard=true일 때만 사용) */
  keyboardHeight?: number;
};

export default function MessageList({
  data,
  bottomInset,
  autoScrollOnKeyboard = true,
  keyboardHeight = 0,
}: Props) {
  const flatRef = useRef<FlatList<ChatMessage>>(null);

  // 새 메시지 추가/초기 진입 시 맨 아래로
  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: false });
  }, [data.length]);

  // 키보드가 뜨면 살짝 텀을 두고 맨 아래로(레이아웃 안정화 후)
  useEffect(() => {
    if (!autoScrollOnKeyboard) return;
    const id = setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 10);
    return () => clearTimeout(id);
  }, [keyboardHeight]);

  return (
    <FlatList
      ref={flatRef}
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MessageItem item={item} />}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
    />
  );
}
