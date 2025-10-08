// components/Chat/MessageList/MessageList.tsx
import type { ChatMessage } from '@/types/chat';
import { getLocalIdentity } from '@/utils/localIdentity'; // ✅ 내 이메일/ID
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/** ✅ 다양한 time 필드 지원: time | ts | createdAt | created_at | timestamp */
const toMs = (m: any): number => {
  const t =
    m?.time ??
    m?.ts ??
    m?.createdAt ??
    m?.created_at ??
    m?.timestamp ??
    0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return Number(new Date(t));
  if (t instanceof Date) return +t;
  return 0;
};

/** ✅ 안전한 key 생성 (id 없을 때 time 기반) */
const getKey = (msg: any, idx: number) => {
  return String(msg?.id ?? `${toMs(msg)}_${idx}`);
};

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

  // ✅ 정렬 표준화: 과거→현재(오름차순)으로 통일해서 "맨 아래 = 최신"
  const sorted = useMemo(() => {
    // 원본 배열(data)을 절대 변형하지 않도록 복사
    const arr = Array.isArray(data) ? [...data] : [];
    arr.sort((a, b) => toMs(a) - toMs(b));
    return arr;
  }, [data]);

  // 새 메시지 추가/초기 진입 시 맨 아래로
  useEffect(() => {
    // 렌더 직후 레이아웃이 안정되도록 약간의 텀을 두고 이동
    const id = setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(id);
  }, [sorted.length]);

  // 키보드가 뜨면 살짝 텀을 두고 맨 아래로(레이아웃 안정화 후)
  useEffect(() => {
    if (!autoScrollOnKeyboard) return;
    const id = setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 10);
    return () => clearTimeout(id);
  }, [keyboardHeight, autoScrollOnKeyboard]);

  // ✅ “내 메시지” 판정: senderEmail 우선 → 없으면 senderId 비교 → 둘 다 없으면 false
  const isMine = (m: ChatMessage) => {
    // 타입에 없는 필드일 수 있으므로 any 접근 허용
    const senderEmail = (m as any).senderEmail as string | null | undefined;
    const senderId    = (m as any).senderId as string | null | undefined;

    if (senderEmail && meEmail) return normEmail(senderEmail) === normEmail(meEmail);
    if (!senderEmail && senderId && meId) return String(senderId) === String(meId);
    return false; // 메타가 없으면 내 것이라고 가정하지 않음(오인 방지)
  };

  return (
    <FlatList
      ref={flatRef}
      data={sorted}
      keyExtractor={(item, idx) => getKey(item, idx)}
      renderItem={({ item }) => (
        // ✅ MessageItem에 mine 플래그 전달
        <MessageItem item={item} mine={isMine(item)} />
      )}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
      keyboardShouldPersistTaps="handled"
      // ✅ 레이아웃 변경 시 하단 고정 유지
      onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
      onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
      showsVerticalScrollIndicator={false}
      // 성능/점진적 렌더링(필요시 조절)
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={7}
      removeClippedSubviews={false}
    />
  );
}
