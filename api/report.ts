// /api/report.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

export type ReportPostType =
  | 'USED_ITEM'
  | 'LOST_ITEM'
  | 'GROUP_BUY'
  | 'ALL'
  | 'ADMIN'
  | 'Chat';

export type ReportReason =
  | 'OBSCENE_CONTENT'
  | 'ETC'
  | 'IMPERSONATION_FAKE_INFO'
  | 'PROMOTION_ADVERTISING'
  | 'SPAM'
  | 'DEFAMATION_HATE';

export type CreateReportReq = {
  reportedId?: string | number | null; // 숫자일 때만 보냄
  postType: ReportPostType;
  postId?: number | string | null;
  reason: ReportReason;
  content: string;
  imageUrls: string[];
};

async function getAccessTokenFromAnywhere(): Promise<string | null> {
  const keys = ['accessToken','access_token','auth_access_token','jwt','token','Authorization'];
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [, vRaw] of pairs) {
      const v = (vRaw ?? '').trim();
      if (!v) continue;
      return v.startsWith('Bearer ') ? v.slice(7) : v;
    }
    const hdr = api.defaults.headers.common.Authorization as string | undefined;
    if (hdr?.startsWith('Bearer ')) return hdr.slice(7);
  } catch {}
  return null;
}

function toNumericOrUndef(v: any): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return undefined;
}

export function pickHttpUrls(uris?: string[]): string[] {
  return (uris ?? []).filter((u) => /^https?:\/\//i.test(u));
}

/** ✅ 신고 사유(한글) → 서버 Enum 정확 매핑 */
export function mapReportReason(kor: string): ReportReason {
  const s = (kor || '').trim();

  // 자주 쓰는 한글 라벨
  if (s === '부적절한 콘텐츠' || /음란|혐오성|선정|폭력/i.test(s)) return 'OBSCENE_CONTENT';
  if (s === '사기/스팸' || /스팸|사기/i.test(s)) return 'SPAM';
  if (s === '욕설/혐오' || /욕설|비방|모욕|혐오|차별/i.test(s)) return 'DEFAMATION_HATE';
  if (s === '홍보/광고') return 'PROMOTION_ADVERTISING';
  if (s === '사칭/허위정보' || /사칭|허위|가짜|fake|impersonation/i.test(s)) return 'IMPERSONATION_FAKE_INFO';
  if (s === '기타') return 'ETC';

  // 혹시 영문 키워드가 직접 들어왔을 때 안전하게 보정
  const upper = s.toUpperCase().replace(/\s+/g, '_');
  switch (upper) {
    case 'OBSCENE_CONTENT':
    case 'SPAM':
    case 'DEFAMATION_HATE':
    case 'PROMOTION_ADVERTISING':
    case 'IMPERSONATION_FAKE_INFO':
    case 'ETC':
      return upper as ReportReason;
    default:
      return 'ETC';
  }
}

/** 화면 kind → 서버 postType Enum */
export function mapKindToPostType(kind?: string): ReportPostType {
  switch ((kind || '').toLowerCase()) {
    case 'market':   return 'USED_ITEM';
    case 'lost':     return 'LOST_ITEM';
    case 'groupbuy': return 'GROUP_BUY';
    case 'notice':   return 'ALL';     // 서버 enum에 NOTICE 없음 → ALL 처리
    case 'chat':     return 'Chat';    // 대소문자 그대로
    case 'admin':    return 'ADMIN';
    default:         return 'ALL';
  }
}

export async function createReport(payload: CreateReportReq) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

  const body: any = {
    postType: payload.postType,
    reason: payload.reason,
    content: payload.content,
    imageUrls: pickHttpUrls(payload.imageUrls),
  };

  const rid = toNumericOrUndef(payload.reportedId);
  if (rid !== undefined) body.reportedId = rid;

  const pid = toNumericOrUndef(payload.postId);
  if (pid !== undefined) body.postId = pid;

  console.log('[REPORT BODY]', body);
  const { data } = await api.post('/report', body);
  return data;
}
