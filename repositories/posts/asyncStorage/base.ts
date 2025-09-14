import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostsRepo } from '../PostsRepo';

export function makeAsyncStorageRepo<T extends { id: string }>(KEY: string): PostsRepo<T> {
  return {
    async list() {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as T[]) : [];
    },
    async getById(id: string) {
      const list = await this.list();
      return list.find((p) => String(p.id) === String(id)) ?? null;
    },
    async upsert(item: T) {
      const list = await this.list();
      const idx = list.findIndex((p) => String(p.id) === String(item.id));
      if (idx >= 0) {
        list[idx] = item;
      } else {
        // prepend 최신 우선
        list.unshift(item);
      }
      await AsyncStorage.setItem(KEY, JSON.stringify(list));
    },
    async delete(id: string) {
      const list = await this.list();
      const next = list.filter((p) => String(p.id) !== String(id));
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    },
  };
}
