import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity'; // ✅ 내 이메일/ID
import React, { useEffect, useRef, useState } from 'react';
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

/** 이메일 정규화(대소문자/공백 무시) */
const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

export default function MessageList({
  data,
  bottomInset,
  autoScrollOnKeyboard = true,
  keyboardHeight = 0,
}: Props) {
  const flatRef = useRef<FlatList<ChatMessage>>(null);

  // ✅ 현재 로그인 사용자(표시용 판정에 사용)
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { userEmail, userId } = await getLocalIdentity();
        setMeEmail(userEmail ?? null);
        setMeId(userId ?? null);
      } catch {
        setMeEmail(null);
        setMeId(null);
      }
    })();
  }, []);

  // 새 메시지 추가/초기 진입 시 맨 아래로
  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: false });
  }, [data.length]);

  // 키보드가 뜨면 살짝 텀을 두고 맨 아래로(레이아웃 안정화 후)
  useEffect(() => {
    if (!autoScrollOnKeyboard) return;
    const id = setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 10);
    return () => clearTimeout(id);
  }, [keyboardHeight, autoScrollOnKeyboard]);

  // ✅ “내 메시지” 판정: senderEmail 우선 → 없으면 senderId 비교 → 둘 다 없으면 false
  const isMine = (m: ChatMessage) => {
    // 타입에 새 필드가 없다면 any로 안전 접근(아래 2)에서 타입 보강 안내)
    const senderEmail = (m as any).senderEmail as string | null | undefined;
    const senderId    = (m as any).senderId as string | null | undefined;

    if (senderEmail && meEmail) return normEmail(senderEmail) === normEmail(meEmail);
    if (!senderEmail && senderId && meId) return String(senderId) === String(meId);
    return false; // 메타가 없으면 내 것이라고 가정하지 않음(오인 방지)
  };

  return (
    <FlatList
      ref={flatRef}
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        // ✅ MessageItem에 mine 플래그 전달
        <MessageItem item={item} mine={isMine(item)} />
      )}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
      showsVerticalScrollIndicator={false}
    />
  );
}
