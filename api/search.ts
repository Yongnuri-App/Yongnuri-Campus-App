// api/search.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

export type SearchItem = {
  id: string | number;
  boardType?: string;            // "MARKET" | "LOST" | "GROUP" | "NOTICE" or 한글 레이블
  title?: string;
  location?: string;
  price?: number | string | null;
  like?: number;
  createdAt?: string;            // ISO 또는 "N초/분/시간/일 전"
  startDate?: string;
  endDate?: string;
  images?: string[];
  thumbnailUrl?: string;

  // ✅ 백엔드 추가: 상태 배지 (예: "REPORTED")
  statusBadge?: string;

  // ✅ 아직 백엔드가 안 줄 수도 있음 (주면 최우선)
  type?: string;                 // LOST/FOUND/RETRIEVED, 한글 등
  recruit?: { mode?: 'unlimited' | 'limited'; count?: number | null };
};

export type Unified =
  | { kind: 'market'; id: string; data: any }
  | { kind: 'lost'; id: string; data: any }
  | { kind: 'group'; id: string; data: any }
  | { kind: 'notice'; id: string; data: any };

/* -------------------- 유틸 -------------------- */

// "방금 전 / N초 전 / N분 전 / N시간 전 / N일 전" → ISO
function relativeKoToIso(s?: string): string {
  const now = Date.now();
  if (!s) return new Date(now).toISOString();
  if (s === '방금 전' || s === '방금전') return new Date(now - 30 * 1000).toISOString();

  const sec = s.match(/^(\d+)\s*초\s*전$/);
  if (sec) return new Date(now - Number(sec[1]) * 1000).toISOString();

  const m = s.match(/^(\d+)\s*분\s*전$/);
  if (m) return new Date(now - Number(m[1]) * 60 * 1000).toISOString();

  const h = s.match(/^(\d+)\s*시간\s*전$/);
  if (h) return new Date(now - Number(h[1]) * 60 * 60 * 1000).toISOString();

  const d = s.match(/^(\d+)\s*일\s*전$/);
  if (d) return new Date(now - Number(d[1]) * 24 * 60 * 60 * 1000).toISOString();

  const t = Date.parse(s);
  return isNaN(t) ? new Date(now).toISOString() : new Date(t).toISOString();
}

// boardType(영문/한글) → 프론트 kind
function mapKind(bt?: string): Unified['kind'] {
  const raw = (bt || '').trim();
  const up = raw.toUpperCase();
  if (/중고거래/.test(raw)) return 'market';
  if (/분실|습득/.test(raw)) return 'lost';
  if (/공동구매|공구/.test(raw)) return 'group';
  if (/공지/.test(raw)) return 'notice';
  if (['USED_ITEM','MARKET'].includes(up)) return 'market';
  if (['LOST_ITEM','LOST'].includes(up)) return 'lost';
  if (['GROUP_BUY','GROUP'].includes(up)) return 'group';
  if (['NOTICE','ANNOUNCE'].includes(up)) return 'notice';
  return 'market';
}

function sortKey(u: Unified) {
  return u.kind === 'notice'
    ? new Date(u.data?.createdAt ?? u.data?.startDate ?? 0).getTime()
    : new Date(u.data?.createdAt ?? 0).getTime();
}

/** ✅ 분실물 타입 표준화
 * 우선순위:
 *   1) it.type (백엔드에서 주면 최우선)
 *   2) it.statusBadge (예: "REPORTED" → found 로 간주)
 *   3) title 키워드 추정
 */
function normalizeLostType(it: SearchItem): 'lost' | 'found' | 'retrieved' {
  // 1) 서버가 type을 주면 최우선 (영문/한글 모두 대응)
  const v = (it.type ?? '').toString().trim().toLowerCase();
  if (v) {
    if (/(found|습득)/.test(v)) return 'found';
    if (/(retriev|returned|return|회수)/.test(v)) return 'retrieved';
    if (/(lost|분실)/.test(v)) return 'lost';
  }

  // 2) statusBadge 기반 — 확정 규칙
  const b = (it.statusBadge ?? '').toString().trim().toUpperCase();
  if (/(RETRIEVED|RETURNED|RETURN|회수)/.test(b)) return 'retrieved';
  if (/(FOUND|REPORTED|습득)/.test(b)) return 'found';

  // 3) 아무 정보 없으면 기본 분실
  return 'lost';
}

/* -------------------- API -------------------- */

export async function fetchUnifiedSearch(query: string): Promise<Unified[]> {
  const token =
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('access_token')) ||
    undefined;

  const res = await api.get<SearchItem[]>('/search', {
    params: { q: query },
    headers: token ? { accessToken: token.replace(/^Bearer\s+/i, '') } : undefined,
  });

  const rows = Array.isArray(res.data) ? res.data : [];

  const unified: Unified[] = rows.map((it) => {
    const kind = mapKind(it.boardType);
    const id = String(it.id);

    // createdAt: ISO 우선, 상대표현/이상값은 안전 변환
    const createdIso = (() => {
      const t = Date.parse(it.createdAt || '');
      return isNaN(t) ? relativeKoToIso(it.createdAt) : new Date(t).toISOString();
    })();

    const images =
      it.images && it.images.length > 0
        ? it.images
        : it.thumbnailUrl
        ? [it.thumbnailUrl]
        : [];

    const base = {
      id,
      title: it.title ?? '',
      createdAt: createdIso,
      likeCount: typeof it.like === 'number' ? it.like : 0,
      images,
      description: undefined as string | undefined,
      content: undefined as string | undefined,
      location: it.location ?? '',
      price: it.price ?? 0,
      startDate: it.startDate,
      endDate: it.endDate,
      statusBadge: it.statusBadge as string | undefined, // e.g. "REPORTED"
    };

    if (kind === 'market') {
      return {
        kind,
        id,
        data: {
          ...base,
          mode: (Number(it.price || 0) === 0 ? 'donate' : 'sell') as 'donate' | 'sell',
        },
      };
    }

    if (kind === 'lost') {
      return {
        kind,
        id,
        data: {
          ...base,
          type: normalizeLostType(it), // ← 여기서 보정
        },
      };
    }

    // api/search.ts (group 매핑 부분만 교체)
    if (kind === 'group') {
      const sb = (it.statusBadge ?? '').toString().trim().toUpperCase();
      const closedByStatus = /(COMPLETED|DONE|FINISH|ENDED|CLOSED|마감|완료)/.test(sb);
      const closedByDate = it.endDate ? new Date(it.endDate).getTime() < Date.now() : false;

      // ✅ 백에서 추가로 내려주는 정원/현재인원 반영
      const limitRaw =
        (it as any).limit ??
        (it as any).maxCount ??
        (it as any).recruitLimit ??
        null; // 여러 이름 대비
      const currentRaw =
        (it as any).currentCount ??
        (it as any).current ??
        0;

      const limit =
        limitRaw === null || limitRaw === undefined || limitRaw === ''
          ? null
          : Number(limitRaw);

      const current = Number(currentRaw) || 0;

      // 정원이 유효하면, 현재인원이 정원 이상이면 마감
      const closedByCapacity = limit != null && limit > 0 ? current >= limit : false;

      const isClosed = closedByStatus || closedByDate || closedByCapacity;

      return {
        kind,
        id,
        data: {
          ...base,
          // ✅ recruit 정보도 제대로 내려주기
          recruit: {
            mode: limit == null ? 'unlimited' : 'limited',
            count: limit,
            current, // 필요하면 쓰려고 같이 보관
          },
          isClosed,
        },
      };
    }


    return { kind, id, data: { ...base } }; // notice
  });

  return unified.sort((a, b) => sortKey(b) - sortKey(a));
}
