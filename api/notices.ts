// /api/notices.ts
/**
 * 관리자 공지 관련 API
 * ----------------------------------------
 * 백엔드 엔드포인트:
 *  - POST   /admin/notices        → 공지 작성
 *  - PATCH  /admin/notices/{id}   → 공지 수정
 *  - DELETE /admin/notices/{id}   → 공지 삭제
 *  - GET    /board/notices        → 공지 목록 조회 (모두 접근 가능)
 *  - GET    /board/notices/{id}   → 공지 상세 조회 (모두 접근 가능)
 * ----------------------------------------
 * 작성자: Yongnuri Campus Team
 * 프론트: React Native (Expo, TypeScript)
 */

import { api } from './client';

// 백엔드 Enum 그대로 매칭
export type NoticeStatus = 'RECRUITING' | 'COMPLETED' | 'DELETED';

// 공지 작성 요청 DTO
export type CreateNoticeRequest = {
  title: string;
  content: string;
  isImages?: boolean;
  link?: string;
  startDate?: string; // ISO 포맷(예: 2025-10-11T10:30:00)
  endDate?: string;
  status?: NoticeStatus;
};

// 공지 수정 요청 DTO
export type UpdateNoticeRequest = Partial<CreateNoticeRequest>;

// 공지 응답 DTO (백엔드 NoticeResponseDto 기준)
export type NoticeResponse = {
  id: number;
  title: string;
  content?: string | null;
  link?: string | null;
  status: NoticeStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  authorNickname?: string | null;
  thumbnailUrl?: string | null;
  bookmarked?: boolean;
};

/* -----------------------------------------------------------
 * ✅ 1) 공지 작성 (POST /admin/notices)
 * - 관리자 전용
 * --------------------------------------------------------- */
export async function createNotice(body: CreateNoticeRequest) {
  console.log('[API REQ] POST /admin/notices', body);
  const { data } = await api.post<NoticeResponse>('/admin/notices', body);
  console.log('[API RES] POST /admin/notices ->', data);
  return data;
}

/* -----------------------------------------------------------
 * ✅ 2) 공지 수정 (PATCH /admin/notices/{id})
 * --------------------------------------------------------- */
export async function updateNotice(
  id: number | string,
  body: UpdateNoticeRequest
) {
  console.log(`[API REQ] PATCH /admin/notices/${id}`, body);
  const { data } = await api.patch<NoticeResponse>(
    `/admin/notices/${id}`,
    body
  );
  console.log(`[API RES] PATCH /admin/notices/${id} ->`, data);
  return data;
}

/* -----------------------------------------------------------
 * ✅ 3) 공지 삭제 (DELETE /admin/notices/{id})
 * --------------------------------------------------------- */
export async function deleteNotice(id: number | string) {
  console.log(`[API REQ] DELETE /admin/notices/${id}`);
  const { data } = await api.delete(`/admin/notices/${id}`);
  console.log(`[API RES] DELETE /admin/notices/${id} ->`, data);
  return data as { message?: string };
}

/* -----------------------------------------------------------
 * ✅ 4) 공지 목록 조회 (GET /board/notices)
 * --------------------------------------------------------- */
export async function getNotices() {
  console.log('[API REQ] GET /board/notices');
  const { data } = await api.get<NoticeResponse[]>('/board/notices');
  console.log('[API RES] GET /board/notices ->', data);
  return data;
}

/* -----------------------------------------------------------
 * ✅ 5) 공지 상세 조회 (GET /board/notices/{id})
 * --------------------------------------------------------- */
export async function getNoticeDetail(id: number | string) {
  console.log(`[API REQ] GET /board/notices/${id}`);
  const { data } = await api.get<NoticeResponse>(`/board/notices/${id}`);
  console.log(`[API RES] GET /board/notices/${id} ->`, data);
  return data;
}
