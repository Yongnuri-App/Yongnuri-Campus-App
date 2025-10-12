// /api/notices.ts
/**
 * 관리자 공지 관련 API
 * ----------------------------------------
 * 백엔드 엔드포인트 (모두 /board/notices 하위):
 *  - POST   /board/notices           → 공지 작성 (관리자)
 *  - PATCH  /board/notices/{id}      → 공지 수정 (관리자)
 *  - DELETE /board/notices/{id}      → 공지 삭제 (관리자, soft delete)
 *  - GET    /board/notices           → 공지 목록 조회 (전체)
 *  - GET    /board/notices/{id}      → 공지 상세 조회 (전체)
 * ----------------------------------------
 */

import { api } from './client';

// 백엔드 Enum 그대로 매칭
export type NoticeStatus = 'RECRUITING' | 'COMPLETED' | 'DELETED';

/** 서버 ImageDto와 1:1 매칭 */
export type NoticeImage = {
  imageUrl: string;
  sequence: number;
};

// 공지 응답 DTO (백엔드 NoticeResponseDto 기준)
export type NoticeResponse = {
  id: number;
  title: string;
  content?: string | null;
  link?: string | null;
  status: NoticeStatus;
  startDate?: string | null; // ISO 문자열
  endDate?: string | null;   // ISO 문자열
  createdAt: string;         // ISO 문자열
  authorNickname?: string | null;
  thumbnailUrl?: string | null;
  isBookmarked?: boolean;    // Lombok의 isBookmarked 게터 → JSON 키는 bookmarked 또는 isBookmarked 둘 다 가능성
  bookmarked?: boolean;      // 백엔드 직렬화 정책에 따라 둘 중 하나가 올 수 있어 대비
  images?: NoticeImage[];    // 상세에서만 채워짐
};

// 공지 작성 DTO (서버 요구 스펙)
export type CreateNoticeRequest = {
  title: string;
  content: string;
  status: NoticeStatus;      // 서버 @NotBlank → 필수
  link?: string;
  startDate?: string;        // "YYYY-MM-DDTHH:mm:ss"
  endDate?: string;
  imageUrls?: string[];      // 이미지 업로드 후 얻은 URL들
};

// 공지 수정 DTO (부분 수정 허용)
export type UpdateNoticeRequest = Partial<CreateNoticeRequest>;

// 생성 응답 스키마: { message, noticeId }
export type CreateNoticeResponse = {
  message: string;
  noticeId: number;
};

/* -----------------------------------------------------------
 * 1) 공지 작성 (POST /board/notices)
 * --------------------------------------------------------- */
export async function createNotice(body: CreateNoticeRequest) {
  const { data } = await api.post<CreateNoticeResponse>('/board/notices', body);
  return data;
}

/* -----------------------------------------------------------
 * 2) 공지 수정 (PATCH /board/notices/{id})
 * --------------------------------------------------------- */
export async function updateNotice(id: number | string, body: UpdateNoticeRequest) {
  await api.patch(`/board/notices/${id}`, body);
}

/* -----------------------------------------------------------
 * 3) 공지 삭제 (DELETE /board/notices/{id})
 * --------------------------------------------------------- */
export async function deleteNotice(id: number | string) {
  await api.delete(`/board/notices/${id}`);
}

/* -----------------------------------------------------------
 * 4) 공지 목록 조회 (GET /board/notices) — 배열 반환
 * --------------------------------------------------------- */
export async function getNotices() {
  const { data } = await api.get<NoticeResponse[]>('/board/notices');
  return data;
}

/* -----------------------------------------------------------
 * 5) 공지 상세 조회 (GET /board/notices/{id})
 * --------------------------------------------------------- */
export async function getNoticeDetail(id: number | string) {
  const { data } = await api.get<NoticeResponse>(`/board/notices/${id}`);
  return data;
}
