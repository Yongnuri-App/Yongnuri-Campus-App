// src/api/makedeal.ts
// -------------------------------------------------------------
// "약속잡기" 생성 API 래퍼 (POST /board/makedeal)
// - 서버 DTO와 1:1 매핑
// -------------------------------------------------------------
import { api } from './client';

export type PostType = 'USED_ITEM' | 'LOST_ITEM';

export interface MakeDealCreateReq {
  chatRoomId: number | string;
  buyerId: number;            // 서버는 Long, 프론트는 number로 보냄
  postType: PostType;
  postId: number | string;
  date: string;               // "yyyy-MM-dd"
  time: string;               // "HH:mm"
  location: string;
  /** ✅ 약속 알림: n시간 전 푸시/알림 (백엔드 지원) */
  notifyBeforeHours?: number; // e.g. 3
}

export interface MakeDealCreateRes {
  message?: string;
  appointmentId: number;
}

export async function createMakeDeal(payload: MakeDealCreateReq) {
  const { data } = await api.post<MakeDealCreateRes>('/board/makedeal', payload);
  return data;
}
