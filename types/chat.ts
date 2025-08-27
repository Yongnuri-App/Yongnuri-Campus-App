// /src/types/chat.ts
// 채팅에서 공통으로 쓰이는 타입 정의 모음

/** 채팅 메시지: 텍스트/이미지 두 가지 형태 */
export type ChatMessage =
  | { id: string; type: 'text'; text: string; time: string; mine?: boolean }
  | { id: string; type: 'image'; uri: string; time: string; mine?: boolean };

/** 채팅방 상단(헤더)에서 표시할 타이틀을 외부에서 주입할 때 사용 */
export type ChatHeaderTitle = string;
