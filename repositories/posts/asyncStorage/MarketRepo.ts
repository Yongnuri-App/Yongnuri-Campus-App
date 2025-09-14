import { makeAsyncStorageRepo } from './base';
import type { PostsRepo } from '../PostsRepo';

// 필요한 필드만 선언(유연성)
export type MarketPost = {
  id: string;
  title: string;
  description: string;
  mode: 'sell' | 'donate';
  price: number;
  location: string;
  images: string[];
  likeCount?: number;
  createdAt: string; // ISO
  authorId?: string | number;
  authorEmail?: string | null;
};

const KEY = 'market_posts_v1';

const base = makeAsyncStorageRepo<MarketPost>(KEY);

export const MarketRepo: PostsRepo<MarketPost> = {
  ...base,
};

export default MarketRepo;
