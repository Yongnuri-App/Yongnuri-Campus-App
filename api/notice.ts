// src/api/notice.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

const ADMIN_INQUIRY_NOTICE_KEY = 'admin_inquiry_notice_v1';

/** Bearer 접두사 제거 */
function stripBearer(v?: string | null) {
  if (!v) return '';
  return v.startsWith('Bearer ') ? v.slice('Bearer '.length) : v;
}

/** ---------------------------------------------
 * [관리자] 공지 저장 : POST /admin/notice (body: { accessToken, text })
 * --------------------------------------------- */
export async function postInquiryNotice(text: string) {
  const stored =
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('access_token')) ||
    (await AsyncStorage.getItem('auth_token')) ||
    '';
  const accessToken = stripBearer(stored);

  const res = await api.post('/admin/notice', { accessToken, text });

  // 성공 시 로컬 캐시도 갱신
  try {
    await AsyncStorage.setItem(ADMIN_INQUIRY_NOTICE_KEY, text);
  } catch {}
  return res?.data;
}

/** ---------------------------------------------
 * [관리자] 공지 조회 : GET /admin/notice?accessToken=...
 * (관리자 화면 전용, 403이면 캐시 폴백)
 * --------------------------------------------- */
export async function getAdminInquiryNotice(defaultText = ''): Promise<string> {
  const stored =
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('access_token')) ||
    (await AsyncStorage.getItem('auth_token')) ||
    '';
  const accessToken = stripBearer(stored);

  try {
    const res = await api.get('/admin/notice', { params: { accessToken } });
    const serverText =
      typeof res?.data === 'string'
        ? res.data
        : res?.data?.text ?? res?.data?.notice ?? '';

    if (serverText && serverText.trim()) {
      try {
        await AsyncStorage.setItem(ADMIN_INQUIRY_NOTICE_KEY, serverText);
      } catch {}
      return serverText;
    }
  } catch {
    // ignore → 캐시 폴백
  }

  const cached = await AsyncStorage.getItem(ADMIN_INQUIRY_NOTICE_KEY);
  return (cached && cached.trim()) ? cached : defaultText;
}

/** ---------------------------------------------
 * [일반/유저] 공지 조회 : GET /notice (토큰 불필요 가정)
 * 서버 미지원/실패 시 캐시 폴백
 * --------------------------------------------- */
export async function getPublicInquiryNotice(defaultText = ''): Promise<string> {
  try {
    const res = await api.get('/notice');
    const serverText =
      typeof res?.data === 'string'
        ? res.data
        : res?.data?.text ?? res?.data?.notice ?? '';

    if (serverText && serverText.trim()) {
      try {
        await AsyncStorage.setItem(ADMIN_INQUIRY_NOTICE_KEY, serverText);
      } catch {}
      return serverText;
    }
  } catch {
    // ignore → 캐시 폴백
  }

  const cached = await AsyncStorage.getItem(ADMIN_INQUIRY_NOTICE_KEY);
  return (cached && cached.trim()) ? cached : defaultText;
}
