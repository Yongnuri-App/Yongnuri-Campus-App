// api/report.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

/* ===== 공용 타입 (백엔드 enum과 정확히 일치) ===== */
export type ReportPostType =
  | 'USED_ITEM'
  | 'LOST_ITEM'
  | 'GROUP_BUY'
  | 'NOTICE'
  | 'CHAT'
  | 'ADMIN';

export type ReportReason =
  | 'OBSCENE_CONTENT'
  | 'SPAM'
  | 'DEFAMATION_HATE'
  | 'PROMOTION_ADVERTISING'
  | 'IMPERSONATION_FAKE_INFO'
  | 'ETC';

export type CreateReportReq = {
  reportedId: number;          // ★ 필수 (숫자)
  postType: ReportPostType;    // 필수
  postId?: number | null;      // 선택
  reason: ReportReason;        // 필수
  content: string;             // 필수
  imageUrls: string[];         // [] 허용
};

export type CreateReportRes = {
  message: string;
  reporterId?: number;
};

export type AdminReportRow = {
  id: number;
  reportStudentId: number | null;
  reportStudentNickName: string | null;
  reportType: ReportPostType | null;
  typeId: number | null;
  reportReason: ReportReason | null;
  content: string | null;
  processedAt: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
};

export type AdminReportListRes = AdminReportRow[];

/* ===== 토큰/유틸 ===== */
async function getAccessTokenFromAnywhere(): Promise<string | null> {
  const keys = [
    'accessToken',
    'access_token',
    'auth_access_token',
    'jwt',
    'token',
    'Authorization',
  ];
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

/* ===== 한글 라벨 → 서버 Enum ===== */
export function mapReportReason(kor: string): ReportReason {
  const s = (kor || '').trim();
  switch (s) {
    case '부적절한 콘텐츠': return 'OBSCENE_CONTENT';
    case '사기/스팸':       return 'SPAM';
    case '욕설/혐오':       return 'DEFAMATION_HATE';
    case '홍보/광고':       return 'PROMOTION_ADVERTISING';
    case '사칭/허위정보':   return 'IMPERSONATION_FAKE_INFO';
    case '기타':            return 'ETC';
    default: {
      const upper = s.toUpperCase().replace(/\s+/g, '_');
      if (
        [
          'OBSCENE_CONTENT','SPAM','DEFAMATION_HATE',
          'PROMOTION_ADVERTISING','IMPERSONATION_FAKE_INFO','ETC',
        ].includes(upper)
      ) return upper as ReportReason;
      return 'ETC';
    }
  }
}

/* ===== 화면 kind → 서버 postType Enum ===== */
export function mapKindToPostType(kind?: string): ReportPostType {
  switch ((kind || '').toLowerCase()) {
    case 'market':   return 'USED_ITEM';
    case 'lost':     return 'LOST_ITEM';
    case 'groupbuy': return 'GROUP_BUY';
    case 'notice':   return 'NOTICE';
    case 'chat':     return 'CHAT';
    case 'admin':    return 'ADMIN';
    default:         return 'USED_ITEM';
  }
}

/* ===== 신고 생성 ===== */
export async function createReport(payload: CreateReportReq): Promise<CreateReportRes> {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

  const rid = toNumericOrUndef(payload.reportedId);
  if (rid == null) {
    throw new Error('reportedId가 없습니다. 신고 대상의 사용자 ID(숫자)가 필요합니다.');
  }

  const body: any = {
    reportedId: rid,                           // ★ 필수로 전송
    postType: payload.postType,
    reason: payload.reason,
    content: payload.content,
    imageUrls: pickHttpUrls(payload.imageUrls),
  };

  const pid = toNumericOrUndef(payload.postId);
  if (pid !== undefined) body.postId = pid;

  // 인터셉터가 Authorization 붙임
  const { data } = await api.post('/report', body);
  // 백 응답은 { message, reporterId? } 형태로 처리
  return {
    message: data?.message ?? '신고가 정상 접수되었습니다.',
    reporterId: data?.reporterId,
  };
}

/* ===== 관리자 목록 (서버) ===== */
export async function getAdminReportList(): Promise<AdminReportListRes> {
  const { data } = await api.get('/admin/reportList');
  const arr = Array.isArray(data) ? data : [];
  return arr.map((r: any) => ({
    id: Number(r.id),
    reportStudentId: r.reportStudentId ?? null,
    reportStudentNickName: r.reportStudentNickName ?? null,
    reportType: (r.reportType as ReportPostType) ?? null,
    typeId: r.typeId ?? null,
    reportReason: (r.reportReason as ReportReason) ?? null,
    content: r.content ?? null,
    processedAt: r.processedAt ?? null,
    status: (r.status as 'PENDING' | 'APPROVED' | 'REJECTED') ?? null,
  }));
}

/* ===== 서버 + 로컬 폴백 ===== */
export async function getAdminReportListWithFallback(): Promise<AdminReportListRes> {
  try {
    const rows = await getAdminReportList();
    if (rows.length > 0) return rows;
  } catch (e) {
    console.log('[ADMIN REPORT] server error, will try local fallback', e);
  }
  try {
    const raw = await AsyncStorage.getItem('reports_v1');
    const list: any[] = raw ? JSON.parse(raw) : [];
    return list.map((r, i) => {
      const nick =
        (r?.target?.nickname ?? '').trim() ||
        (r?.target?.label ? String(r.target.label).split(' - ')[0] : '') ||
        (r?.target?.email ? String(r.target.email).split('@')[0] : '') ||
        null;

      return {
        id: Number(r?.id ?? i + 1),
        reportStudentId: typeof r?.target?.userId === 'number' ? r.target.userId : null,
        reportStudentNickName: nick,
        reportType: mapKindToPostType(r?.target?.kind),
        typeId: r?.target?.postId ? Number(r.target.postId) : null,
        reportReason: mapReportReason(r?.type ?? '기타'),
        content: r?.content ?? null,
        processedAt: null,
        status: (r?.status as 'PENDING' | 'APPROVED' | 'REJECTED') ?? 'PENDING',
      };
    });
  } catch {
    return [];
  }
}
