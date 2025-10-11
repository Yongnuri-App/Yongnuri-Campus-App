// /api/client.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * expo app.json 의 extra 값 (LAN IP 등)을 읽어 서버 baseURL 을 정한다.
 */
type Extra = { apiBaseUrl?: string; profilePath?: string };
const extra = (Constants?.expoConfig?.extra ?? {}) as Extra;

// 에뮬레이터 기본값
const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

// 실기기 테스트 시 app.json > extra.apiBaseUrl 값이 우선
const BASE_URL = extra.apiBaseUrl ?? DEFAULT_BASE_URL;

// ✅ 프로필 엔드포인트(백엔드 실 경로) — 기본 /mypage
const PROFILE_PATH = extra.profilePath ?? '/mypage';

/**
 * 공용 axios 인스턴스
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

/**
 * 전역 Authorization 헤더를 세팅/해제하는 함수
 * - 로그인 성공 시 setAuthToken(accessToken)
 * - 로그아웃 시 setAuthToken(undefined)
 */
export const setAuthToken = (token?: string) => {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  api.defaults.headers.common.Authorization = value;
};

/** --------------------------------------------------------------------------------
 * 요청 인터셉터
 * 1) /users/me → PROFILE_PATH 로 리라이트
 * 2) /auth/** 경로는 절대 Authorization 붙이지 않음 (로그인/회원가입 등)
 * 3) 그 외 요청에는 Authorization 없으면 AsyncStorage에서 토큰을 복구해 자동 부착
 * --------------------------------------------------------------------------------*/

/** 절대/상대 URL 모두에서 path만 뽑는 유틸 */
const toPath = (url?: string) => {
  if (!url) return '';
  try {
    return url.startsWith('http') ? new URL(url).pathname : url;
  } catch {
    return url;
  }
};

/** /auth/** 여부 체크 (로그인/회원가입 등 인증 우회 필요 구간) */
const isAuthFreePath = (path: string) => /^\/auth(\/|$)/.test(path);

api.interceptors.request.use(
  // ✅ AsyncStorage 접근이 필요하므로 async 인터셉터 사용
  async (config) => {
    // 1) /users/me 리라이트 (절대/상대 경로 모두 대응)
    if (config.url) {
      const u = config.url.startsWith('http') ? new URL(config.url).pathname : config.url;
      if (u === '/users/me') {
        config.url = PROFILE_PATH; // 예: '/mypage'
      }
    }

    const path = toPath(config.url);

    // 2) /auth/** 요청이면 Authorization 제거(토큰이 있어도 붙이지 않음)
    if (isAuthFreePath(path)) {
      if (config.headers) {
        delete (config.headers as any).Authorization;
      }
      // 디버깅용 로그
      console.log(`[API REQ] (auth-skip) ${config.method?.toUpperCase()} ${path}`);
      return config;
    }

    // 3) 나머지 요청: Authorization 헤더가 비어있으면 AsyncStorage에서 복구하여 부착
    const hasAuth = !!config.headers?.Authorization;
    if (!hasAuth) {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('access_token'));
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = token.startsWith('Bearer ')
          ? token
          : `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 응답 인터셉터 (로깅)
 */
api.interceptors.response.use(
  (res) => {
    console.log(
      `[API RES] ${res.config.method?.toUpperCase()} ${res.config.url} -> ${res.status}`
    );
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
