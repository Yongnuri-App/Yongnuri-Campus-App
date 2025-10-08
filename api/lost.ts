// api/lost.ts
import { api } from './client';

// 🔧 로컬 폴백용 저장소 유틸은 최상단에, 그리고 올바른 경로로!
import { makeAsyncStorageRepo } from '../repositories/posts/asyncStorage/base';
import type { PostsRepo } from '../repositories/posts/PostsRepo';

/** ====== 생성 ====== */
const LOST_DEFAULT_STATUS = 'PROCEEDING';

export async function createLostFoundPost(payload: {
  title: string;
  purpose: 'LOST' | 'FOUND';
  content: string;
  imageUrls: string[];
  location: string;
  status?: string; // 없으면 PROCEEDING 기본값
}) {
  const body = { ...payload, status: payload.status ?? LOST_DEFAULT_STATUS };
  console.log('[createLostFoundPost] payload', JSON.stringify(body));
  const { data } = await api.post('/board/lost-found', body);
  return data as { postId: number; message: string };
}

/** ====== 상세 ====== */
export type LostDetailImage = {
  imageUrl: string;
  sequence: number;
};

export type GetLostDetailRes = {
  post_id: number;
  title: string;
  content: string;
  purpose: 'LOST' | 'FOUND';
  location: string;
  createdAt?: string;
  created_at?: string;
  authorNickname: string | null;
  status: 'REPORTED' | 'RETURNED' | 'DELETED';
  images: LostDetailImage[] | null;
  sequence?: number;
  bookmarked: boolean;
  bookmarkCount: number;
};

export async function getLostFoundDetail(postId: string | number) {
  const pid = Number(postId);
  const url = `/board/lost-found/${pid}`;
  console.log('[API REQ] GET', url, '| auth:true');
  const { data } = await api.get<GetLostDetailRes>(url);
  console.log('[API RES] GET', url, '-> 200');
  console.log('[API RES DATA]', data);
  return data;
}

/** ====== 수정(PATCH) ====== */
// ❗ 서버 명세: path + body 둘 다 post_id 필요, 그리고 id는 number 여야 함.
export async function updateLostFoundPost(
  postId: string | number,
  payload: Partial<{
    title: string;
    purpose: 'LOST' | 'FOUND';
    content: string;
    imageUrls: string[];
    location: string;
    status: 'REPORTED' | 'RETURNED' | 'DELETED' | 'PROCEEDING';
  }>
) {
  const pid = Number(postId);

  // undefined 필드 제거
  const body: Record<string, any> = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined) body[k] = v;
  });

  // ✅ 서버 구현 차이를 모두 커버: body에 id와 post_id 동시 포함
  body.id = pid;
  body.post_id = pid;

  const url = `/board/lost-found/${pid}`;
  console.log('[API REQ] PATCH', url, body, '| auth:true');
  const { data } = await api.patch(url, body);
  console.log('[API RES] PATCH', url, '->', data);
  return data as { postId: number; message: string };
}

/** ====== 목록 ====== */
export type GetLostListItemRes = {
  post_id: number;
  title: string;
  location: string;
  created_at?: string;
  createdAt?: string;
  purpose: 'LOST' | 'FOUND';
  status: 'REPORTED' | 'RETURNED' | 'DELETED';
  thumbnailUrl?: string | null;
  bookmarked?: boolean;
  bookmarkCount?: number;
};

export async function getLostFoundList(locationLabel?: string) {
  const params =
    locationLabel && locationLabel !== '전체' ? { location: locationLabel } : undefined;

  const url = '/board/lost-found';
  console.log('[API REQ] GET', url, 'params=', params);
  const { data } = await api.get(url, { params });
  console.log('[API RES] GET', url, '->', Array.isArray(data) ? data.length : data);
  return data as any[];
}

/** ====== 로컬 폴백 저장소 (변경 없음, 단 import 경로만 수정) ====== */
export type LostPost = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  content: string;
  location: string;
  images: string[];
  likeCount?: number;
  createdAt: string; // ISO
  authorId?: string | number;
  authorEmail?: string | null;
};

const KEY = 'lost_found_posts_v1';

const base = makeAsyncStorageRepo<LostPost>(KEY);

export const LostRepo: PostsRepo<LostPost> = {
  ...base,
};

export default LostRepo;
