// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage JSON 로드 헬퍼
 * - 파싱 실패/키 없음 → fallback 리턴
 */
export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * AsyncStorage JSON 저장 헬퍼
 */
export async function saveJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
