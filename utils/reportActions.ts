// // utils/reportActions.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { normEmail } from './localIdentity';
// import { addUserAlarm } from './alarmStorage';
// import {
//   makeReportApprovedTemplate,
//   makeReportRejectedTemplate,
//   makeReportWarn5Template,
//   makeReportWarn9Template,
// } from './alarmTemplates';
// import { USERS_ALL_KEY } from './session'; // ✅ 10회 탈퇴 시 users_all_v1에서 삭제

// // ===== 타입 =====
// export type ReportType = '부적절한 콘텐츠' | '사기/스팸' | '욕설/혐오' | '기타';
// export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// export type StoredReport = {
//   id: string;
//   target: {
//     email?: string | null;     // 글 작성자 이메일(개인 알림 대상)
//     nickname?: string;
//     dept?: string;
//     label?: string;            // 표시용 "닉네임 - 학과" 등

//     // ✅ 삭제/문구 정확도를 위한 권장 필드
//     postId?: string;           // 글 ID
//     storageKey?: string;       // 실제 저장소 키 (예: 'market_posts_v1')
//     postTitle?: string;        // 글 제목
//     kind?: 'market' | 'lost' | 'groupbuy' | 'notice' | 'other';
//   };
//   type: ReportType;
//   content: string;
//   images: string[];
//   createdAt: string;           // ISO
//   reporterEmail?: string | null;
//   status?: ReportStatus;
// };

// // ===== 저장소 키 =====
// export const REPORTS_KEY = 'reports_v1';
// export const MARKET_KEY = 'market_posts_v1';
// export const LOST_KEY = 'lost_found_posts_v1';
// export const GROUPBUY_KEY = 'groupbuy_posts_v1';
// export const NOTICE_KEY = 'notice_posts_v1';

// const KIND_TO_KEY: Record<string, string> = {
//   market: MARKET_KEY,
//   lost: LOST_KEY,
//   groupbuy: GROUPBUY_KEY,
//   notice: NOTICE_KEY,
// };

// const uniqId = (p = 'alarm') =>
//   `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// // ===== 내부 유틸 =====
// function sameId(a: any, b: any) {
//   return String(a) === String(b);
// }

// // 배열/객체(list/items) 모두 대응해서 삭제 시도
// async function tryDeleteInKey(storageKey: string, postId: string): Promise<boolean> {
//   const raw = await AsyncStorage.getItem(storageKey);
//   if (!raw) return false;

//   try {
//     const data = JSON.parse(raw);

//     // 1) 배열 구조
//     if (Array.isArray(data)) {
//       const before = data.length;
//       const afterArr = data.filter((it: any) => !sameId(it?.id, postId));
//       if (afterArr.length !== before) {
//         await AsyncStorage.setItem(storageKey, JSON.stringify(afterArr));
//         return true;
//       }
//       return false;
//     }

//     // 2) 객체 형태(list/items 보유)
//     if (data && typeof data === 'object') {
//       const keys = ['list', 'items'];
//       for (const k of keys) {
//         if (Array.isArray((data as any)[k])) {
//           const before = (data as any)[k].length;
//           const after = (data as any)[k].filter((it: any) => !sameId(it?.id, postId));
//           if (after.length !== before) {
//             (data as any)[k] = after;
//             await AsyncStorage.setItem(storageKey, JSON.stringify(data));
//             return true;
//           }
//         }
//       }
//     }

//     return false;
//   } catch {
//     return false;
//   }
// }

// async function deleteTargetPostIfPossible(report: StoredReport): Promise<boolean> {
//   const pid = report?.target?.postId;
//   if (!pid) return false;

//   const candidates: string[] = [];
//   if (report?.target?.storageKey) candidates.push(report.target.storageKey);
//   const fromKind = report?.target?.kind && KIND_TO_KEY[report.target.kind];
//   if (fromKind) candidates.push(fromKind);
//   candidates.push(MARKET_KEY, LOST_KEY, GROUPBUY_KEY, NOTICE_KEY);

//   const uniq = Array.from(new Set(candidates));
//   for (const key of uniq) {
//     const ok = await tryDeleteInKey(key, pid);
//     if (ok) return true;
//   }
//   return false;
// }

// // ✅ 10회 도달 시 users_all_v1에서 해당 이메일 제거(자동 탈퇴)
// async function removeUserImmediately(emailNorm: string): Promise<boolean> {
//   if (!emailNorm) return false;
//   const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
//   const list: any[] = raw ? JSON.parse(raw) : [];
//   const next = list.filter((u: any) => (u?.email || '').toLowerCase() !== emailNorm);
//   if (next.length === list.length) return false; // 이미 없음
//   await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(next));
//   return true;
// }

// // 보고서 상태 갱신
// async function updateReportStatus(reportId: string, newStatus: ReportStatus): Promise<StoredReport | null> {
//   const raw = await AsyncStorage.getItem(REPORTS_KEY);
//   const list: StoredReport[] = raw ? JSON.parse(raw) : [];
//   const idx = list.findIndex((r) => r.id === reportId);
//   if (idx < 0) return null;
//   const updated: StoredReport = { ...list[idx], status: newStatus };
//   list[idx] = updated;
//   await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(list));
//   return updated;
// }

// // ===== 퍼블릭 API =====

// // ✅ 승인: 글 삭제 + 작성자 알림 + 누적 경고(5회/9회) + 10회 즉시 탈퇴
// export async function approveReport(reportId: string) {
//   const updated = await updateReportStatus(reportId, 'APPROVED');
//   if (!updated) throw new Error('신고 데이터를 찾을 수 없습니다.');

//   // 글 삭제 시도
//   await deleteTargetPostIfPossible(updated);

//   // 작성자에게 '인정' 결과 알림
//   const identity = normEmail(updated?.target?.email || '');
//   if (identity) {
//     const now = new Date().toISOString();
//     const tpl = makeReportApprovedTemplate({
//       postTitle: updated?.target?.postTitle || updated?.target?.label,
//       reasonType: updated.type,
//     });
//     await addUserAlarm(identity, {
//       id: uniqId('alarm'),
//       title: tpl.title,
//       description: tpl.description,
//       createdAt: now,
//       reportIcon: tpl.reportIcon === true,
//     });

//     // ✅ 누적 승인 횟수 계산(해당 사용자)
//     const rawAll = await AsyncStorage.getItem(REPORTS_KEY);
//     const all: StoredReport[] = rawAll ? JSON.parse(rawAll) : [];
//     const approvedCount = all.filter(
//       r =>
//         (r.status || 'PENDING') === 'APPROVED' &&
//         normEmail(r.target?.email || '') === identity
//     ).length;

//     // ✅ 5회 경고
//     if (approvedCount === 5) {
//       const w5 = makeReportWarn5Template();
//       await addUserAlarm(identity, {
//         id: uniqId('alarm'),
//         title: w5.title,
//         description: w5.description,
//         createdAt: new Date().toISOString(),
//         reportIcon: w5.reportIcon === true,
//       });
//     }

//     // ✅ 9회 경고
//     if (approvedCount === 9) {
//       const w9 = makeReportWarn9Template();
//       await addUserAlarm(identity, {
//         id: uniqId('alarm'),
//         title: w9.title,
//         description: w9.description,
//         createdAt: new Date().toISOString(),
//         reportIcon: w9.reportIcon === true,
//       });
//     }

//     // ✅ 10회: 즉시 자동 탈퇴 (users_all_v1에서 제거)
//     if (approvedCount >= 10) {
//       await removeUserImmediately(identity);
//       // (선택) 개인 알림/세션 정리는 각 디바이스에서 별도 처리하도록 두고,
//       // 여기서는 계정 데이터만 제거해 시스템 레벨 '탈퇴' 상태를 반영.
//     }
//   }

//   return true;
// }

// // ❇️ 반려: (옵션) 작성자에게 결과 알림
// export async function rejectReport(reportId: string) {
//   const updated = await updateReportStatus(reportId, 'REJECTED');
//   if (!updated) throw new Error('신고 데이터를 찾을 수 없습니다.');

//   const identity = normEmail(updated?.target?.email || '');
//   if (identity) {
//     const now = new Date().toISOString();
//     const tpl = makeReportRejectedTemplate({
//       postTitle: updated?.target?.postTitle || updated?.target?.label,
//     });
//     await addUserAlarm(identity, {
//       id: uniqId('alarm'),
//       title: tpl.title,
//       description: tpl.description,
//       createdAt: now,
//       reportIcon: tpl.reportIcon === true,
//     });
//   }
//   return true;
// }

// utils/reportActions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addUserAlarm } from './alarmStorage';
import {
  makeReportApprovedTemplate,
  makeReportRejectedTemplate,
  makeReportWarn5Template,
  makeReportWarn9Template,
} from './alarmTemplates';
import { normEmail } from './localIdentity';
import { USERS_ALL_KEY } from './session'; // ✅ 10회 탈퇴 시 users_all_v1에서 삭제

// ===== 타입 =====
export type ReportType = '부적절한 콘텐츠' | '사기/스팸' | '욕설/혐오' | '기타';
export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type StoredReport = {
  id: string;
  target: {
    email?: string | null;     // 글 작성자 이메일(개인 알림 대상)
    nickname?: string;
    dept?: string;
    label?: string;            // 표시용 "닉네임 - 학과" 등

    // ✅ 삭제/문구 정확도를 위한 권장 필드
    postId?: string;           // 글 ID
    storageKey?: string;       // 실제 저장소 키 (예: 'market_posts_v1')
    postTitle?: string;        // 글 제목
    kind?: 'market' | 'lost' | 'groupbuy' | 'notice' | 'other';
  };
  type: ReportType;
  content: string;
  images: string[];
  createdAt: string;           // ISO
  reporterEmail?: string | null;
  status?: ReportStatus;
};

// ===== 저장소 키 =====
export const REPORTS_KEY = 'reports_v1';
export const MARKET_KEY = 'market_posts_v1';
export const LOST_KEY = 'lost_found_posts_v1';
export const GROUPBUY_KEY = 'groupbuy_posts_v1';
export const NOTICE_KEY = 'notice_posts_v1';

const KIND_TO_KEY: Record<string, string> = {
  market: MARKET_KEY,
  lost: LOST_KEY,
  groupbuy: GROUPBUY_KEY,
  notice: NOTICE_KEY,
};

const uniqId = (p = 'alarm') =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ===== 내부 유틸 =====
function sameId(a: any, b: any) {
  return String(a) === String(b);
}

// 배열/객체(list/items) 모두 대응해서 삭제 시도
async function tryDeleteInKey(storageKey: string, postId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    // 1) 배열 구조
    if (Array.isArray(data)) {
      const before = data.length;
      const afterArr = data.filter((it: any) => !sameId(it?.id, postId));
      if (afterArr.length !== before) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(afterArr));
        return true;
      }
      return false;
    }

    // 2) 객체 형태(list/items 보유)
    if (data && typeof data === 'object') {
      const keys = ['list', 'items'];
      for (const k of keys) {
        if (Array.isArray((data as any)[k])) {
          const before = (data as any)[k].length;
          const after = (data as any)[k].filter((it: any) => !sameId(it?.id, postId));
          if (after.length !== before) {
            (data as any)[k] = after;
            await AsyncStorage.setItem(storageKey, JSON.stringify(data));
            return true;
          }
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

async function deleteTargetPostIfPossible(report: StoredReport): Promise<boolean> {
  const pid = report?.target?.postId;
  if (!pid) return false;

  const candidates: string[] = [];
  if (report?.target?.storageKey) candidates.push(report.target.storageKey);
  const fromKind = report?.target?.kind && KIND_TO_KEY[report.target.kind];
  if (fromKind) candidates.push(fromKind);
  candidates.push(MARKET_KEY, LOST_KEY, GROUPBUY_KEY, NOTICE_KEY);

  const uniq = Array.from(new Set(candidates));
  for (const key of uniq) {
    const ok = await tryDeleteInKey(key, pid);
    if (ok) return true;
  }
  return false;
}

// ✅ 10회 도달 시 users_all_v1에서 해당 이메일 제거(자동 탈퇴)
async function removeUserImmediately(emailNorm: string): Promise<boolean> {
  if (!emailNorm) return false;
  const raw = await AsyncStorage.getItem(USERS_ALL_KEY);
  const list: any[] = raw ? JSON.parse(raw) : [];
  const next = list.filter((u: any) => (u?.email || '').toLowerCase() !== emailNorm);
  if (next.length === list.length) return false; // 이미 없음
  await AsyncStorage.setItem(USERS_ALL_KEY, JSON.stringify(next));
  return true;
}

// 보고서 상태 갱신
async function updateReportStatus(reportId: string, newStatus: ReportStatus): Promise<StoredReport | null> {
  const raw = await AsyncStorage.getItem(REPORTS_KEY);
  const list: StoredReport[] = raw ? JSON.parse(raw) : [];
  const idx = list.findIndex((r) => r.id === reportId);
  if (idx < 0) return null;
  const updated: StoredReport = { ...list[idx], status: newStatus };
  list[idx] = updated;
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(list));
  return updated;
}

// ===== 퍼블릭 API =====

// ✅ 승인: 글 삭제 + 작성자 알림 + 누적 경고(5회/9회) + 10회 즉시 탈퇴
export async function approveReport(reportId: string) {
  const updated = await updateReportStatus(reportId, 'APPROVED');
  if (!updated) throw new Error('신고 데이터를 찾을 수 없습니다.');

  // 글 삭제 시도
  await deleteTargetPostIfPossible(updated);

  // 작성자에게 '인정' 결과 알림
  const identity = normEmail(updated?.target?.email || '');
  if (identity) {
    const now = new Date().toISOString();
    const tpl = makeReportApprovedTemplate({
      postTitle: updated?.target?.postTitle || updated?.target?.label,
      reasonType: updated.type,
    });
    await addUserAlarm(identity, {
      id: uniqId('alarm'),
      title: tpl.title,
      description: tpl.description,
      createdAt: now,
      reportIcon: tpl.reportIcon === true,
    });

    // ✅ 누적 승인 횟수 계산(해당 사용자)
    const rawAll = await AsyncStorage.getItem(REPORTS_KEY);
    const all: StoredReport[] = rawAll ? JSON.parse(rawAll) : [];
    const approvedCount = all.filter(
      r =>
        (r.status || 'PENDING') === 'APPROVED' &&
        normEmail(r.target?.email || '') === identity
    ).length;

    // ✅ 5회 경고
    if (approvedCount === 5) {
      const w5 = makeReportWarn5Template();
      await addUserAlarm(identity, {
        id: uniqId('alarm'),
        title: w5.title,
        description: w5.description,
        createdAt: new Date().toISOString(),
        reportIcon: w5.reportIcon === true,
      });
    }

    // ✅ 9회 경고
    if (approvedCount === 9) {
      const w9 = makeReportWarn9Template();
      await addUserAlarm(identity, {
        id: uniqId('alarm'),
        title: w9.title,
        description: w9.description,
        createdAt: new Date().toISOString(),
        reportIcon: w9.reportIcon === true,
      });
    }

    // ✅ 10회: 즉시 자동 탈퇴 (users_all_v1에서 제거)
    if (approvedCount >= 10) {
      await removeUserImmediately(identity);
      // (선택) 개인 알림/세션 정리는 각 디바이스에서 별도 처리하도록 두고,
      // 여기서는 계정 데이터만 제거해 시스템 레벨 '탈퇴' 상태를 반영.
    }
  }

  return true;
}

// ❇️ 반려: (옵션) 작성자에게 결과 알림
export async function rejectReport(reportId: string) {
  const updated = await updateReportStatus(reportId, 'REJECTED');
  if (!updated) throw new Error('신고 데이터를 찾을 수 없습니다.');

  const identity = normEmail(updated?.target?.email || '');
  if (identity) {
    const now = new Date().toISOString();
    const tpl = makeReportRejectedTemplate({
      postTitle: updated?.target?.postTitle || updated?.target?.label,
    });
    await addUserAlarm(identity, {
      id: uniqId('alarm'),
      title: tpl.title,
      description: tpl.description,
      createdAt: now,
      reportIcon: tpl.reportIcon === true,
    });
  }
  return true;
}
