// /api/groupBuy.ts
import { api } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ─ Types ─ */
export type CreateGroupBuyReq = {
  title: string;
  content: string;
  imageUrls: string[];
  limit: number | null;
  link: string;
  status?: string;
};

export type CreateGroupBuyRes = { id: number } & Record<string, any>;

export type GroupDetailImage = {
  imageUrl: string;
  sequence: number;
};

export type GetGroupBuyDetailRes = {
  id?: number;
  post_id?: number;
  title: string;
  content: string;
  limit: number | null;
  currentCount?: number;
  current_count?: number;
  createdAt?: string;
  created_at?: string;
  authorNickname: string | null;
  authorDepartment?: string | null;
  authorEmail?: string | null;
  status: 'RECRUITING' | 'COMPLETED' | 'DELETED';
  images: GroupDetailImage[] | null;
  sequence?: number;
  link?: string;
  bookmarked?: boolean;
  bookmarkCount?: number;
  thumbnailUrl?: string | null;
};

/* ─ Token helper ─ */
const TOKEN_KEYS = [
  'accessToken',
  'access_token',
  'auth_access_token',
  'jwt',
  'token',
  'Authorization',
];

async function getAccessTokenFromAnywhere(): Promise<string | null> {
  try {
    const pairs = await AsyncStorage.multiGet(TOKEN_KEYS);
    for (const [, vRaw] of pairs) {
      const v = (vRaw ?? '').trim();
      if (!v) continue;
      const token = v.startsWith('Bearer ') ? v.slice(7) : v;
      if (token) return token;
    }
    const hdr = api.defaults.headers.common.Authorization as string | undefined;
    if (hdr?.startsWith('Bearer ')) return hdr.slice(7);
  } catch {}
  return null;
}

/* ─ Create ─ */
export async function createGroupBuyPost(payload: CreateGroupBuyReq) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

  const body = {
    accessToken,
    title: payload.title,
    content: payload.content,
    imageUrls: payload.imageUrls ?? [],
    limit: payload.limit,
    link: payload.link,
    status: payload.status ?? 'RECRUITING',
  };

  console.log('[GroupBuy] POST /board/group-buys body=', { ...body, accessToken: '***' });
  const { data } = await api.post<CreateGroupBuyRes>('/board/group-buys', body);
  return data;
}

/* ─ List (옵션) ─ */
export async function getGroupBuyList(locationLabel?: string) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');
  const params: Record<string, any> = { accessToken };
  if (locationLabel && locationLabel !== '전체') params.location = locationLabel;

  const url = '/board/group-buys';
  console.log('[API REQ] GET', url, 'params=', params);
  const { data } = await api.get(url, { params });
  console.log('[API RES] GET', url, '->', Array.isArray(data) ? data.length : data);
  return data as any[];
}

/* ─ Detail ─ */
export async function getGroupBuyDetail(postId: string | number) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');
  const pid = Number(postId);
  const url = `/board/group-buys/${pid}`;
  const params = { accessToken };

  console.log('[API REQ] GET', url, 'params=', params);
  const { data } = await api.get<GetGroupBuyDetailRes>(url, { params });
  console.log('[API RES] GET', url, '-> 200');
  console.log('[API RES DATA]', data);
  return data;
}

/* ─ Current count PATCH ─ */
export async function updateGroupBuyCurrentCount(postId: string | number, count: number) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');
  const pid = Number(postId);
  const url = `/board/group-buys/${pid}/current-count`;
  const body = { accessToken, count };

  console.log('[API REQ] PATCH', url, body);
  const { data } = await api.patch(url, body);
  console.log('[API RES] PATCH', url, '->', data);
  return data as { message?: string; currentCount?: number; current_count?: number } | any;
}

/* ─ 글 수정 PATCH ─ */
export async function updateGroupBuyPost(
  postId: string | number,
  payload: Partial<{
    title: string;
    content: string;
    imageUrls: string[];
    limit: number | null;
    link: string;
    status: 'RECRUITING' | 'COMPLETED' | 'DELETED';
  }>
) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

  const pid = Number(postId);
  const url = `/board/group-buys/${pid}`;

  const body: Record<string, any> = { accessToken };
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined) body[k] = v;
  });

  console.log('[API REQ] PATCH', url, JSON.stringify(body));
  const { data } = await api.patch(url, body);
  console.log('[API RES] PATCH /board/group-buys/{id} ->', data);
  return data as { message: string; postId: number } | any;
}

/* ─ NEW: 공동구매 신청 POST ─
 *  POST /board/group-buys/{post_id}/apply
 *  body: { accessToken, post_id }  (post_id는 서버가 PathVariable을 쓰므로 없어도 OK)
 */
export async function applyGroupBuy(postId: string | number) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

  const pid = Number(postId);
  const url = `/board/group-buys/${pid}/apply`;
  const body = { accessToken, post_id: pid };

  console.log('[API REQ] POST', url, body);
  const { data } = await api.post(url, body);
  console.log('[API RES] POST', url, '->', data);
  // 서버는 문자열 메시지를 반환: "공동구매 신청이 완료되었습니다."
  return (typeof data === 'string' ? { message: data } : data) as { message?: string };
}
