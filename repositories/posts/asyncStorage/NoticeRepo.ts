import { makeAsyncStorageRepo } from './base';
import type { PostsRepo } from '../PostsRepo';

export type NoticePost = {
  id: string;
  title: string;
  description: string;
  images?: string[];
  startDate?: string;  // ISO
  endDate?: string;    // ISO
  createdAt?: string;  // ISO
  applyUrl?: string | null;
  likeCount?: number;
  authorName?: string;
  authorDept?: string;
};

const KEY = 'notice_posts_v1';

const base = makeAsyncStorageRepo<NoticePost>(KEY);

export const NoticeRepo: PostsRepo<NoticePost> = {
  ...base,
};

export default NoticeRepo;
