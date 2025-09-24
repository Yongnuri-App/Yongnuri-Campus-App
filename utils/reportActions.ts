// utils/reportActions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normEmail } from './localIdentity';
import { addUserAlarm } from './alarmStorage';
import { makeReportApprovedTemplate, makeReportRejectedTemplate } from './alarmTemplates';

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

// ===== 저장소 키(앱에 맞춰 필요시 수정) =====
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

    // 2) 객체에 list/items로 들어있는 구조도 지원
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

  // 1) 우선순위 후보 리스트 만들기
  const candidates: string[] = [];

  // (1) 신고에 storageKey가 명시되어 있으면 최우선
  if (report?.target?.storageKey) candidates.push(report.target.storageKey);

  // (2) kind가 있으면 맵핑 키 추가
  const fromKind = report?.target?.kind && KIND_TO_KEY[report.target.kind];
  if (fromKind) candidates.push(fromKind);

  // (3) 보수적으로 모든 후보도 포함
  candidates.push(MARKET_KEY, LOST_KEY, GROUPBUY_KEY, NOTICE_KEY);

  // 중복 제거
  const uniq = Array.from(new Set(candidates));

  // 2) 순차 시도
  for (const key of uniq) {
    const ok = await tryDeleteInKey(key, pid);
    if (ok) return true;
  }
  return false;
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

// ✅ 승인: 글 삭제 + 작성자 개인 알림(신고 아이콘 포함)
export async function approveReport(reportId: string) {
  const updated = await updateReportStatus(reportId, 'APPROVED');
  if (!updated) throw new Error('신고 데이터를 찾을 수 없습니다.');

  // 1) 삭제 시도
  await deleteTargetPostIfPossible(updated);

  // 2) 작성자에게 개인 알림 발송
  const identity = normEmail(updated?.target?.email || '');
  if (identity) {
    const now = new Date().toISOString();

    // 템플릿에서 title/description + reportIcon 추출
    const tpl = makeReportApprovedTemplate({
      postTitle: updated?.target?.postTitle || updated?.target?.label,
      reasonType: updated.type,
    });

    await addUserAlarm(identity, {
      id: uniqId('alarm'),
      title: tpl.title,
      description: tpl.description,
      createdAt: now,
      reportIcon: tpl.reportIcon === true, // ← 아이콘 플래그 저장
    });
  }
  return true;
}

// ❇️ 반려: (옵션) 작성자에게 결과 알림(신고 아이콘 포함)
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
      reportIcon: tpl.reportIcon === true, // ← 아이콘 플래그 저장
    });
  }
  return true;
}
