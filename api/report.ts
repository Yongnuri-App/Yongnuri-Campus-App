// // /api/report.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { api } from './client';

// /* ================== Types ================== */

// export type ReportPostType =
//   | 'USED_ITEM'
//   | 'LOST_ITEM'
//   | 'GROUP_BUY'
//   | 'ALL'
//   | 'ADMIN'
//   | 'Chat';

// export type ReportReason =
//   | 'OBSCENE_CONTENT'
//   | 'ETC'
//   | 'IMPERSONATION_FAKE_INFO'
//   | 'PROMOTION_ADVERTISING'
//   | 'SPAM'
//   | 'DEFAMATION_HATE';

// export type CreateReportReq = {
//   reportedId?: string | number | null; // 숫자일 때만 보냄
//   postType: ReportPostType;
//   postId?: number | string | null;
//   reason: ReportReason;
//   content: string;
//   imageUrls: string[];
// };

// /** ✅ 관리자 신고목록 한 행 타입 (서버/로컬 폴백 공용) */
// export type AdminReportRow = {
//   id: string;                                   // 고유 식별자
//   reportStudentNickName?: string;               // 신고 대상 닉네임
//   reportReason?: string;                        // 서버 enum string or 한글
//   content?: string;                             // 신고 내용
//   reportType?: string;                          // USED_ITEM / LOST_ITEM ...
//   typeId?: string;                              // 게시글 ID 등
//   status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
//   createdAt?: string;
// };

// /* ================== Token helper ================== */

// async function getAccessTokenFromAnywhere(): Promise<string | null> {
//   const keys = ['accessToken', 'access_token', 'auth_access_token', 'jwt', 'token', 'Authorization'];
//   try {
//     const pairs = await AsyncStorage.multiGet(keys);
//     for (const [, vRaw] of pairs) {
//       const v = (vRaw ?? '').trim();
//       if (!v) continue;
//       return v.startsWith('Bearer ') ? v.slice(7) : v;
//     }
//     const hdr = api.defaults.headers.common.Authorization as string | undefined;
//     if (hdr?.startsWith('Bearer ')) return hdr.slice(7);
//   } catch {}
//   return null;
// }

// function toNumericOrUndef(v: any): number | undefined {
//   if (typeof v === 'number' && Number.isFinite(v)) return v;
//   if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
//   return undefined;
// }

// export function pickHttpUrls(uris?: string[]): string[] {
//   return (uris ?? []).filter((u) => /^https?:\/\//i.test(u));
// }

// /* ================== Mappers (export!) ================== */

// export function mapKindToPostType(kind?: string): ReportPostType {
//   switch ((kind || '').toLowerCase()) {
//     case 'market':   return 'USED_ITEM';
//     case 'lost':     return 'LOST_ITEM';
//     case 'groupbuy': return 'GROUP_BUY';
//     case 'notice':   return 'ALL';   // NOTICE 없음 → ALL
//     case 'chat':     return 'Chat';  // 대소문자 주의
//     case 'admin':    return 'ADMIN';
//     default:         return 'ALL';
//   }
// }

// export function mapReportReason(kor: string): ReportReason {
//   const s = (kor || '').trim();
//   if (s === '부적절한 콘텐츠' || /음란|혐오성|선정|폭력/i.test(s)) return 'OBSCENE_CONTENT';
//   if (s === '사기/스팸' || /스팸|사기/i.test(s)) return 'SPAM';
//   if (s === '욕설/혐오' || /욕설|비방|모욕|혐오|차별/i.test(s)) return 'DEFAMATION_HATE';
//   if (s === '홍보/광고') return 'PROMOTION_ADVERTISING';
//   if (s === '사칭/허위정보' || /사칭|허위|가짜|fake|impersonation/i.test(s)) return 'IMPERSONATION_FAKE_INFO';
//   if (s === '기타') return 'ETC';

//   const upper = s.toUpperCase().replace(/\s+/g, '_');
//   switch (upper) {
//     case 'OBSCENE_CONTENT':
//     case 'SPAM':
//     case 'DEFAMATION_HATE':
//     case 'PROMOTION_ADVERTISING':
//     case 'IMPERSONATION_FAKE_INFO':
//     case 'ETC':
//       return upper as ReportReason;
//     default:
//       return 'ETC';
//   }
// }

// /* ================== API: 신고 작성 ================== */

// export async function createReport(payload: CreateReportReq) {
//   const accessToken = await getAccessTokenFromAnywhere();
//   if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

//   const body: any = {
//     postType: payload.postType,
//     reason: payload.reason,
//     content: payload.content,
//     imageUrls: pickHttpUrls(payload.imageUrls),
//   };

//   const rid = toNumericOrUndef(payload.reportedId);
//   if (rid !== undefined) body.reportedId = rid;

//   const pid = toNumericOrUndef(payload.postId);
//   if (pid !== undefined) body.postId = pid;

//   console.log('[REPORT BODY]', body);
//   const { data } = await api.post('/report', body);
//   return data;
// }

// /* ================== API: 관리자 신고 목록 ================== */

// export async function getAdminReportList(): Promise<AdminReportRow[]> {
//   const accessToken = await getAccessTokenFromAnywhere();
//   if (!accessToken) throw new Error('로그인이 필요합니다. (accessToken 없음)');

//   const params = { accessToken };
//   console.log('[ADMIN REPORT] GET /admin/reportList params=', params);
//   const { data } = await api.get('/admin/reportList', { params });

//   const rows: any[] = Array.isArray(data) ? data : [];
//   console.log('[ADMIN REPORT] server length=', rows.length);

//   // 서버 필드 표준화
//   return rows.map((r, i) => ({
//     id: String(r.id ?? r.reportId ?? i),
//     reportStudentNickName: r.reportStudentNickName ?? r.nickname ?? r.userNickname ?? '',
//     reportReason: r.reportReason ?? r.reason ?? '',
//     content: r.content ?? '',
//     reportType: r.reportType ?? r.postType ?? '',
//     typeId: String(r.typeId ?? r.postId ?? ''),
//     status: r.status ?? 'PENDING',
//     createdAt: r.createdAt ?? r.created_at,
//   }));
// }

// /** ✅ 서버가 빈 배열이면 로컬(reports_v1)로 폴백해 보여주는 함수 */
// export async function getAdminReportListWithFallback(): Promise<AdminReportRow[]> {
//   try {
//     const server = await getAdminReportList();
//     if (server.length > 0) return server;
//   } catch (e) {
//     // 서버 실패 시 폴백으로 진행
//   }

//   // 로컬 폴백
//   const raw = await AsyncStorage.getItem('reports_v1');
//   const list: any[] = raw ? JSON.parse(raw) : [];

//   const mapped: AdminReportRow[] = list.map((r) => {
//     const nick =
//       r?.target?.nickname ||
//       (r?.target?.label ? String(r.target.label).split(' - ')[0] : '') ||
//       (r?.target?.email ? String(r.target.email).split('@')[0] : '') ||
//       '익명';

//     return {
//       id: String(r.id ?? `${Date.now()}`),
//       reportStudentNickName: nick,
//       reportReason:
//         typeof r.type === 'string' ? r.type : r.reportReason || '',
//       content: r.content ?? '',
//       reportType: r.target?.kind || '',
//       typeId: String(r.target?.postId ?? ''),
//       status: r.status || 'PENDING',
//       createdAt: r.createdAt,
//     };
//   });

//   return mapped;
// }

// /* 보조 export (에디터 캐시 이슈 회피) */
// export const __reportHelperExports = { mapKindToPostType, mapReportReason };
