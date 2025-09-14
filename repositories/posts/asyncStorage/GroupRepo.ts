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
  authorId?: string | number;
  authorEmail?: string | null;
};

const KEY = 'groupbuy_posts_v1';

const base = makeAsyncStorageRepo<GroupPost>(KEY);

export const GroupRepo: PostsRepo<GroupPost> = {
  ...base,
};

export default GroupRepo;
