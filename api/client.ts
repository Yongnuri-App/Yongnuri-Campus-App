// /api/client.ts
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = { apiBaseUrl?: string; profilePath?: string };
const extra = (Constants?.expoConfig?.extra ?? {}) as Extra;

// 기본값(시뮬/에뮬)
const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

// 실기기에서 테스트면 app.json > extra.apiBaseUrl에 LAN IP 넣어둔 값이 우선
const BASE_URL = extra.apiBaseUrl ?? DEFAULT_BASE_URL;

// ✅ 프로필 엔드포인트(백엔드 실 경로) — 기본 /mypage
const PROFILE_PATH = extra.profilePath ?? '/mypage';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// 토큰 필요해지면 쓸 수 있도록 남겨둠
export const setAuthToken = (token?: string) => {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  api.defaults.headers.common.Authorization = value;
};

// ✅ 요청 인터셉터: /users/me 로 요청이 오면 설정된 PROFILE_PATH 로 리라이트
api.interceptors.request.use((config) => {
  if (config.url) {
    // 절대/상대 경로 모두 대비
    const u = config.url.startsWith('http') ? new URL(config.url).pathname : config.url;
    if (u === '/users/me') {
      config.url = PROFILE_PATH; // 예: '/mypage'
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log(
      `[API RES] ${res.config.method?.toUpperCase()} ${res.config.url} -> ${res.status}`
    );
    // 응답 본문 일부만 출력(전체가 크면 과해질 수 있음)
    if (res.data && typeof res.data === 'object') {
      const preview = JSON.stringify(res.data);
      console.log('[API RES DATA]', preview.length > 500 ? preview.slice(0, 500) + '…' : preview);
    }
    return res;
  },
  (err) => {
    const cfg = err?.config || {};
    console.log(
      `[API ERR] ${cfg.method?.toUpperCase?.() || ''} ${cfg.baseURL || ''}${cfg.url || ''}`
    );
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || err?.message;
    console.log('[API ERR STATUS]', status);
    console.log('[API ERR MESSAGE]', msg);
    if (err?.response?.data) {
      try {
        console.log('[API ERR DATA]', JSON.stringify(err.response.data));
      } catch {
        console.log('[API ERR DATA]', err.response.data);
      }
    }
    return Promise.reject(err);
  }
);
