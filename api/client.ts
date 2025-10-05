// /api/client.ts
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = { apiBaseUrl?: string };
const extra = (Constants?.expoConfig?.extra ?? {}) as Extra;

// 기본값(시뮬/에뮬)
const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

// 실기기에서 테스트면 app.json > extra.apiBaseUrl에 LAN IP 넣어둔 값이 우선
const BASE_URL = extra.apiBaseUrl ?? DEFAULT_BASE_URL;

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
  // 토큰에 'Bearer '가 이미 붙어 있으면 그대로, 아니면 붙여서 사용
  const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  api.defaults.headers.common.Authorization = value;
};
