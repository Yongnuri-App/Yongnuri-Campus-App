// hooks/usePermissions.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIsAdmin } from '../utils/auth';

type Params = {
  authorId?: string | number;
  authorEmail?: string | null;
  /** 상세 라우트에서 넘겨줄 수 있는 힌트 (ex. isOwner, isAdmin) — 더 이상 isOwner는 신뢰하지 않음 */
  routeParams?: any;
};

const AUTH_USER_ID_KEY = 'auth_user_id';
// 표준 세션 키 + 구(舊) 호환 키 모두 확인
const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

const coerceTrue = (v: any) =>
  v === true || v === 'true' || v === 1 || v === '1';

const sameId = (a?: string | number | null, b?: string | number | null) =>
  a != null && b != null && String(a) === String(b);

const normEmail = (s?: string | null) =>
  (s ?? '').trim().toLowerCase();

const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && normEmail(a) === normEmail(b);

/**
 * 권한 파생 훅
 * - isAdmin: utils/auth 의 getIsAdmin() + route 파라미터 힌트
 * - isOwner: **이메일 우선 매칭**, 이메일이 "양쪽 모두 완전히 없는 경우에만" authorId(디바이스 ID) 폴백
 *
 * 이유:
 *  - auth_user_id 는 "기기 고정 ID"라서 같은 기기에서 계정만 바꿔도 동일 → 오판 위험
 *  - 글 저장 시 authorEmail 을 넣었으므로 이메일로 판별 가능
 */
export default function usePermissions({ authorId, authorEmail, routeParams }: Params) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // 관리자 플래그 로드 (route 힌트가 있으면 OR)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await getIsAdmin(); // AsyncStorage('auth_is_admin') === 'true'
        const hinted = coerceTrue(routeParams?.isAdmin);
        if (mounted) setIsAdmin(!!(saved || hinted));
      } catch {
        if (mounted) setIsAdmin(false);
      }
    })();
    return () => { mounted = false; };
  }, [routeParams?.isAdmin]);

  // 소유자 판별
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const results = await AsyncStorage.multiGet([
          AUTH_EMAIL_KEY,
          AUTH_USER_EMAIL_KEY,
          AUTH_USER_ID_KEY,
        ]);

        // 표준 키 우선, 없으면 구키 사용
        const localEmailStd = results.find(([k]) => k === AUTH_EMAIL_KEY)?.[1] ?? null;
        const localEmailCompat = results.find(([k]) => k === AUTH_USER_EMAIL_KEY)?.[1] ?? null;
        const localId = results.find(([k]) => k === AUTH_USER_ID_KEY)?.[1] ?? null;

        const localEmail = normEmail(localEmailStd || localEmailCompat) || null;
        const authorEmailNorm = normEmail(authorEmail) || null;

        // 1) 이메일이 둘 다 있으면 → 이메일로만 판별
        const emailOwned = !!authorEmailNorm && !!localEmail && sameEmail(authorEmailNorm, localEmail);

        // 2) 이메일이 "양쪽 모두 완전히 없는 경우"에만 → ID 폴백 허용
        const allowIdFallback = !authorEmailNorm && !localEmail;
        const idOwned = allowIdFallback && sameId(authorId ?? null, localId ?? null);

        // 3) route 힌트는 더 이상 isOwner 판별에 사용하지 않음 (오판 위험)
        //    const hintedOwned = coerceTrue(routeParams?.isOwner);

        if (mounted) setIsOwner(!!(emailOwned || idOwned));
      } catch {
        if (mounted) setIsOwner(false);
      }
    })();

    // 작성자 정보가 바뀔 때마다 재계산
  }, [authorId, authorEmail /* routeParams?.isOwner 제거 */]);

  return { isAdmin, isOwner };
}
