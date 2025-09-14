import { makeAsyncStorageRepo } from './base';
import type { PostsRepo } from '../PostsRepo';

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
