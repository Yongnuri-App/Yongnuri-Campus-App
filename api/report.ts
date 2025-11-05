import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

/* ====== 공용 타입 ====== */
export type ReportPostType = 'USED_ITEM' | 'LOST_ITEM' | 'GROUP_BUY' | 'ALL' | 'ADMIN' | 'ALL';

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

/** ✅ 관리자 신고 목록 1행 (서버 기준 키) */
export type AdminReportRow = {
  /** ⚠️ 신고 PK(상세 조회에 필요) */
  id?: number | null;

  reportStudentNickName?: string | null;
  reportReason?: string | null;
  content?: string | null;
  reportType?: string | null;     // 서버 enum 문자열
  typeId?: number | null;         // 게시글/타깃 id
  status?: string | null;         // PENDING/APPROVED/REJECTED 등
};

export type AdminReportListRes = AdminReportRow[];

/** ✅ 관리자 신고 상세 */
export type AdminReportDetailRes = {
  id: number; // reportId (신고 PK)
  reportedStudentId?: number;
  reportedStudentName?: string | null;
  reportedStudentNickName?: string | null;
  reason?: ReportReason | string | null;
  content?: string | null;
  reportType?: string | null;               // ✅ 게시글 타입
  typeId?: number | null;                   // ✅ 게시글 ID
  postTitle?: string | null;                // ✅ 게시글 제목 추가
  images?: { imageUrl: string; sequence: number }[] | null;
};

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

// ✅ file:// 경로는 제외하고 http(s)만 허용
export function pickHttpUrls(uris?: string[]): string[] {
  return (uris ?? []).filter((u) =>
    /^https?:/i.test(u)  // file:// 제거, http(s)만 통과
  );
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

/** (서버 Enum → 한글 라벨) */
export function mapReasonEnumToKor(reason?: string | null): string {
  const r = (reason || '').toUpperCase();
  switch (r) {
    case 'OBSCENE_CONTENT': return '부적절한 콘텐츠';
    case 'SPAM': return '사기/스팸';
    case 'DEFAMATION_HATE': return '욕설/혐오';
    case 'PROMOTION_ADVERTISING': return '홍보/광고';
    case 'IMPERSONATION_FAKE_INFO': return '사칭/허위정보';
    case 'ETC': return '기타';
    default: return reason || '-';
  }
}

/** (화면 kind → 서버 postType Enum) */
export function mapKindToPostType(kind?: string): ReportPostType {
  switch ((kind || '').toLowerCase()) {
    case 'market':   return 'USED_ITEM';
    case 'lost':     return 'LOST_ITEM';
    case 'groupbuy': return 'GROUP_BUY';
    case 'notice':   return 'ALL';
    case 'chat':     return 'ALL' as ReportPostType;  // ✅ 'CHAT' → 'Chat'으로 수정
    case 'admin':    return 'ADMIN';
    default:         return 'ALL';
  }
}

/* ====== 신고 생성 ====== */
export async function createReport(payload: CreateReportReq) {
  const accessToken = await getAccessTokenFromAnywhere();
  if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

  // ✅ imageUrls는 이미 업로드된 서버 경로여야 함
  // (ReportPage.tsx에서 uploadImages 호출 후 전달받음)
  const body: any = {
    postType: payload.postType,
    reason: payload.reason,
    content: payload.content?.trim?.() ?? '',
    imageUrls: payload.imageUrls ?? [],  // pickHttpUrls 제거
  };

  const rid = toNumericOrUndef(payload.reportedId);
  if (rid !== undefined) body.reportedId = rid;

  const pid = toNumericOrUndef(payload.postId);
  if (pid !== undefined) body.postId = pid;

  console.log('[REPORT BODY] ▶', JSON.stringify(body));
  const { data } = await api.post('/report', body);
  return data;
}

/* ====== 관리자 목록 (서버) ====== */
export async function getAdminReportList(): Promise<AdminReportListRes> {
  const { data } = await api.get('/admin/reportList');
  // 서버가 id를 내려보내면 그대로 둠
  return Array.isArray(data) ? (data as AdminReportListRes) : [];
}

/* ====== 관리자 목록 (서버 + 로컬 폴백) ====== */
export async function getAdminReportListWithFallback(): Promise<AdminReportListRes> {
  try {
    const rows = await getAdminReportList();
    // ✅ id 없으면 최대한 보정 (상세 진입을 위해 필요)
    return rows.map((r, i) => ({
      ...r,
      id: r.id ?? (typeof r.typeId === 'number' ? r.typeId : i + 1),
    }));
  } catch (e) {
    console.log('[ADMIN REPORT] server error → fallback to local', e);
  }

  // 로컬 폴백: 신고 작성 시 저장되는 reports_v1 활용
  try {
    const raw = await AsyncStorage.getItem('reports_v1');
    const list: any[] = raw ? JSON.parse(raw) : [];
    const base = Date.now();
    const mapped: AdminReportRow[] = list.map((r, i) => ({
      id: Number(r?.id) || (r?.target?.postId ? Number(r.target.postId) : base + i),
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

/* ====== 관리자 신고 상세 ====== */
export async function getAdminReportDetail(reportId: number | string): Promise<AdminReportDetailRes> {
  const { data } = await api.get(`/admin/report/${reportId}`);
  const d = data as AdminReportDetailRes;
  return {
    id: Number((d as any).id ?? reportId),
    reportedStudentId: (d as any).reportedStudentId ?? null,
    reportedStudentName: (d as any).reportedStudentName ?? null,
    reportedStudentNickName: (d as any).reportedStudentNickName ?? null,
    reason: (d as any).reason ?? (d as any).reportReason ?? null,
    content: (d as any).content ?? null,
    reportType: (d as any).reportType ?? null,                          // ✅ 게시글 타입
    typeId: (d as any).typeId ?? null,                                  // ✅ 게시글 ID
    postTitle: (d as any).postTitle ?? null,                            // ✅ 게시글 제목 추가
    images: Array.isArray((d as any).images) ? (d as any).images : [],
  };
}

/* ====== 관리자 신고 처리 (APPROVED/REJECTED) ====== */
export async function adminProcessReport(reportId: number | string, status: 'APPROVED' | 'REJECTED') {
  const body = { id: Number(reportId), reportStatus: status };
  const { data } = await api.post('/admin/reportProcess', body);
  return data;
}
