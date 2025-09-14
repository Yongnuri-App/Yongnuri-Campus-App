// hooks/usePermissions.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIsAdmin } from '../utils/auth';

type Params = {
  authorId?: string | number;
  authorEmail?: string | null;
  /** 상세 라우트에서 넘겨줄 수 있는 힌트 (ex. isOwner, isAdmin) */
  routeParams?: any;
};

const AUTH_USER_ID_KEY = 'auth_user_id';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

const coerceTrue = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
const sameId = (a?: string | number | null, b?: string | number | null) =>
  a != null && b != null && String(a) === String(b);
const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * 권한 파생 훅
 * - isAdmin: utils/auth 의 getIsAdmin() + route 파라미터 힌트
 * - isOwner: 로컬 로그인 정보(auth_user_id / auth_user_email)와 작성자 정보 매칭, + route 힌트
 *
 * ⚠️ 정책: 관리자 우선
 *   - UI에서 삭제만 보이게 하려면 `isAdmin`이 true인 경우 `showEdit`을 false로 처리하세요.
 */
export default function usePermissions({ authorId, authorEmail, routeParams }: Params) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // 관리자 플래그 로드 (route 힌트가 있으면 OR 로 보강)
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

  // 소유자 판별 (route 파라미터 isOwner 힌트도 OR 처리)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const localId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
        const localEmail = await AsyncStorage.getItem(AUTH_USER_EMAIL_KEY);

        const match =
          sameId(authorId ?? null, localId ?? null) ||
          sameEmail(authorEmail ?? null, localEmail ?? null) ||
          coerceTrue(routeParams?.isOwner);

        if (mounted) setIsOwner(!!match);
      } catch {
        if (mounted) setIsOwner(false);
      }
    })();
    // 작성자 정보/route 힌트가 바뀔 때마다 재계산
  }, [authorId, authorEmail, routeParams?.isOwner]);

  return { isAdmin, isOwner };
}
