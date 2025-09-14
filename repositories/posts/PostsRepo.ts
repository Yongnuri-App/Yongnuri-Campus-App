export interface PostsRepo<T extends { id: string }> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  upsert(item: T): Promise<void>;      // 존재하면 교체, 없으면 추가
  delete(id: string): Promise<void>;
  toggleLike?(id: string, liked: boolean): Promise<void>; // 구현 선택
}
