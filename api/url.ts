// /api/url.ts
import { api } from './client';

/** 서버 상대경로(/uploads/xxx) → 절대 URL(http://IP:PORT/uploads/xxx) */
export function toAbsoluteUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path; // 이미 절대경로면 그대로 사용
  const base = (api.defaults.baseURL || '').replace(/\/+$/, ''); // 끝 슬래시 제거
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
