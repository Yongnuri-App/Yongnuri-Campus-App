import { makeAsyncStorageRepo } from './base';
import type { PostsRepo } from '../PostsRepo';

export type RecruitMode = 'unlimited' | 'limited' | null;

export type GroupPost = {
  id: string;
  title: string;
  description?: string;
  recruit: { mode: RecruitMode; count: number | null };
  applyLink: string;
  images: string[];
  likeCount?: number;
  createdAt: string; // ISO

  // 작성자 정보(서버 포맷과 정합)
  authorId?: string | number;
  authorEmail?: string | null;
  /** 윗줄(닉네임/이름) */
  authorName?: string;
  /** 아랫줄(학과) */
  authorDept?: string;

  /** 상세에서 사용되는 현재 모집 인원 (로컬 캐시) */
  currentCount?: number;

  /** 서버 상태(선택) */
  status?: 'RECRUITING' | 'COMPLETED' | 'DELETED';
};

const KEY = 'groupbuy_posts_v1';

const base = makeAsyncStorageRepo<GroupPost>(KEY);

export const GroupRepo: PostsRepo<GroupPost> = {
  ...base,
};

export default GroupRepo;
