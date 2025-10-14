// /api/report.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

/* ====== 공용 타입 ====== */
export type ReportPostType = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY' | 'ALL' | 'ADMIN' | 'Chat';

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

/** ✅ 관리자 신고 목록 API가 주는 1행 형태(서버 기준 키) */
export type AdminReportRow = {
  reportStudentNickName?: string | null;
  reportReason?: string | null;
  content?: string | null;
  reportType?: string | null;     // 서버 enum 문자열
  typeId?: number | null;         // 게시글/타깃 id
  status?: string | null;         // PENDING/APPROVED/REJECTED 등
};

export type AdminReportListRes = AdminReportRow[];

/* ====== 토큰/유틸 ====== */
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

/** (한글 라벨 → 서버 Enum) */
export function mapReportReason(kor: string): ReportReason {
  const s = (kor || '').trim();
  if (s === '부적절한 콘텐츠' || /음란|혐오성|선정|폭력/i.test(s)) return 'OBSCENE_CONTENT';
  if (s === '사기/스팸' || /스팸|사기/i.test(s)) return 'SPAM';
  if (s === '욕설/혐오' || /욕설|비방|모욕|혐오|차별/i.test(s)) return 'DEFAMATION_HATE';
  if (s === '홍보/광고') return 'PROMOTION_ADVERTISING';
  if (s === '사칭/허위정보' || /사칭|허위|fake|impersonation/i.test(s)) return 'IMPERSONATION_FAKE_INFO';
  if (s === '기타') return 'ETC';
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

/** (화면 kind → 서버 postType Enum) */
export function mapKindToPostType(kind?: string): ReportPostType {
  switch ((kind || '').toLowerCase()) {
    case 'market':   return 'USED_ITEM';
    case 'lost':     return 'LOST_ITEM';
    case 'groupbuy': return 'GROUP_BUY';
    case 'notice':   return 'ALL';     // NOTICE 별도 enum 없음 → ALL 처리
    case 'chat':     return 'Chat';
    case 'admin':    return 'ADMIN';
    default:         return 'ALL';
  }
}

/* ====== 생성 ====== */
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

/* ====== 관리자 목록 (서버) ====== */
export async function getAdminReportList(): Promise<AdminReportListRes> {
  // Authorization 헤더는 client.ts 인터셉터가 자동 부착
  const { data } = await api.get('/admin/reportList');
  return Array.isArray(data) ? (data as AdminReportListRes) : [];
}

/* ====== 관리자 목록 (서버 + 로컬 폴백) ====== */
export async function getAdminReportListWithFallback(): Promise<AdminReportListRes> {
  try {
    const rows = await getAdminReportList();
    console.log('[ADMIN REPORT] server length=', rows.length);
    if (rows.length > 0) return rows;
  } catch (e) {
    console.log('[ADMIN REPORT] server error, will try local fallback', e);
  }

  // 로컬 폴백: 신고 작성 시 저장되는 reports_v1 활용
  try {
    const raw = await AsyncStorage.getItem('reports_v1');
    const list: any[] = raw ? JSON.parse(raw) : [];
    console.log('[ADMIN REPORT] fallback(local) length=', list.length);
    // 서버 포맷으로 가볍게 매핑
    const mapped: AdminReportRow[] = list.map((r) => ({
      reportStudentNickName:
        r?.target?.nickname ||
        (r?.target?.label ? String(r.target.label).split(' - ')[0] : '') ||
        (r?.target?.email ? String(r.target.email).split('@')[0] : '') ||
        '익명',
      reportReason: r?.type || '',
      content: r?.content || '',
      reportType: (r?.target?.kind || 'ALL').toUpperCase(),
      typeId: r?.target?.postId ? Number(r.target.postId) : null,
      status: r?.status || 'PENDING',
    }));
    return mapped;
  } catch {
    return [];
  }
}
