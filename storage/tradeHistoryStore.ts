// storage/tradeHistoryStore.ts
// ---------------------------------------------------------
// 마이페이지 > TradeHistory 에서 사용할 로컬 저장 유틸 (AsyncStorage)
// 여기서는 "분실물 - 회수" 목록만 관리
// ---------------------------------------------------------
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'trade_history_v1';

const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();
const makeRecordId = (postId: string, email: string) => `${postId}__${email || 'unknown'}`;

export type RecoveredLostItem = {
  /** 🔑 고유 레코드 ID: postId + recipientEmail(=ownerEmail) 조합 */
  recordId?: string;            // ← v2에서 추가(기존 데이터엔 없을 수 있음)
  postId: string;
  title: string;
  image?: string;
  place?: string;
  recoveredAt: string; // ISO
  /**
   * ⚠️ 필드명 유산: 필터의 대상 이메일(수신자)입니다.
   * - 실제 '소유자'뿐 아니라, '게시자/상대방' 등 회수 내역을 볼 사용자 이메일로 저장합니다.
   */
  ownerEmail?: string;
  roomId?: string;
  /** (메타) 게시자 이메일 보관해두면 이후 용처에 도움 */
  posterEmail?: string;
};

type TradeHistoryShape = {
  lost?: {
    recovered?: RecoveredLostItem[];
  };
};

async function readAll(): Promise<TradeHistoryShape> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function writeAll(data: TradeHistoryShape): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

/** 회수 칩에 upsert — (postId + ownerEmail) 기준으로 유일 처리 */
export async function upsertRecoveredLostItem(item: RecoveredLostItem): Promise<void> {
  const all = await readAll();
  if (!all.lost) all.lost = {};
  if (!all.lost.recovered) all.lost.recovered = [];

  const email = normEmail(item.ownerEmail);
  const recordId = item.recordId ?? makeRecordId(item.postId, email);

  // v1/기존 데이터 호환: 기존 항목은 recordId가 없을 수 있음 → 비교 키 보정
  const findKey = (x: RecoveredLostItem) =>
    x.recordId ?? makeRecordId(x.postId, normEmail(x.ownerEmail));

  const idx = all.lost.recovered.findIndex((x) => findKey(x) === recordId);

  const next: RecoveredLostItem = {
    ...item,
    ownerEmail: email || undefined,
    recordId,
  };

  if (idx >= 0) {
    all.lost.recovered[idx] = { ...all.lost.recovered[idx], ...next };
  } else {
    // 최신이 위로 오도록 앞에 삽입
    all.lost.recovered.unshift(next);
  }
  await writeAll(all);
}

/** 여러 사용자(게시자/상대방 등)에게 동시에 회수 내역을 반영 */
export async function upsertRecoveredLostItemsForRecipients(
  base: Omit<RecoveredLostItem, 'ownerEmail' | 'recordId'>,
  recipientEmails: Array<string | null | undefined>,
  extra?: Partial<RecoveredLostItem>
): Promise<void> {
  const uniq = Array.from(new Set(
    recipientEmails.map(normEmail).filter(Boolean)
  ));
  for (const email of uniq) {
    await upsertRecoveredLostItem({
      ...base,
      ...extra,
      ownerEmail: email,
      recordId: makeRecordId(base.postId, email),
    });
  }
}

/** 회수 칩 리스트 조회 (TradeHistory 페이지에서 사용) */
export async function getRecoveredLostItems(): Promise<RecoveredLostItem[]> {
  const all = await readAll();
  return all.lost?.recovered ?? [];
}

/** 수신자(=ownerEmail) 기준 필터링 조회 */
export async function getRecoveredLostItemsByOwner(ownerEmail: string): Promise<RecoveredLostItem[]> {
  const list = await getRecoveredLostItems();
  const email = normEmail(ownerEmail);
  if (!email) return list; // 로그인 이메일 없으면 전체 반환(개발/테스트용)
  return list.filter((x) => normEmail(x.ownerEmail) === email);
}
