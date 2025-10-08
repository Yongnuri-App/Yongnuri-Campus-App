// hooks/usePermissions.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIsAdmin } from '../utils/auth';

type Params = {
  authorId?: string | number;
  authorEmail?: string | null;
  /** 서버가 이메일을 주지 않는 경우 닉네임으로 최후의 폴백 판별에 사용 */
  authorNickname?: string | null;
  /** 상세 라우트에서 넘겨줄 수 있는 힌트 (ex. isOwner, isAdmin) */
  routeParams?: any;
};

const AUTH_USER_ID_KEY = 'auth_user_id';
// 표준 세션 키 + 구(舊) 호환 키 모두 확인
const AUTH_EMAIL_KEY = 'auth_email';
const AUTH_USER_EMAIL_KEY = 'auth_user_email';

const USERS_ALL_KEY = 'users_all_v1';

const coerceTrue = (v: any) =>
  v === true || v === 'true' || v === 1 || v === '1';

const sameId = (a?: string | number | null, b?: string | number | null) =>
  a != null && b != null && String(a) === String(b);

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
const sameEmail = (a?: string | null, b?: string | null) => !!a && !!b && norm(a) === norm(b);
const sameNickname = (a?: string | null, b?: string | null) =>
  !!a && !!b && norm(a) === norm(b);

/**
 * 권한 파생 훅
 * - isAdmin: utils/auth 의 getIsAdmin() + route 파라미터 힌트
 * - isOwner: 판별 우선순위
 *    1) 이메일 완전 일치
 *    2) (이메일 양쪽 모두 없음) 기기 로컬 ID(authorId) 일치
 *    3) (1,2 실패) 닉네임 완전 일치 — ⚠️ 동명이인 위험, 최후 폴백으로만 사용
 */
export default function usePermissions({ authorId, authorEmail, authorNickname, routeParams }: Params) {
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
          USERS_ALL_KEY,
        ]);

        // 표준 키 우선, 없으면 구키 사용
        const localEmailStd = results.find(([k]) => k === AUTH_EMAIL_KEY)?.[1] ?? null;
        const localEmailCompat = results.find(([k]) => k === AUTH_USER_EMAIL_KEY)?.[1] ?? null;
        const localId = results.find(([k]) => k === AUTH_USER_ID_KEY)?.[1] ?? null;
        const usersAllRaw = results.find(([k]) => k === USERS_ALL_KEY)?.[1] ?? '[]';

        const localEmail = (localEmailStd || localEmailCompat || '').toLowerCase() || null;

        // 1) 이메일 일치 우선
        const authorEmailNorm = (authorEmail ?? '').toLowerCase() || null;
        const emailOwned = !!authorEmailNorm && !!localEmail && sameEmail(authorEmailNorm, localEmail);

        let owned = emailOwned;

        // 2) 이메일이 "양쪽 모두 완전히 없는 경우"에만 → ID 폴백
        if (!owned) {
          const allowIdFallback = !authorEmailNorm && !localEmail;
          const idOwned = allowIdFallback && sameId(authorId ?? null, localId ?? null);
          owned = owned || idOwned;
        }

        // 3) (최후 폴백) 닉네임 일치 — 이메일/ID로 판별 실패했을 때만 시도
        if (!owned && authorNickname) {
          try {
            const list: any[] = JSON.parse(usersAllRaw || '[]');
            const me = list.find(
              (u) => (u?.email ?? '').toLowerCase() === (localEmail ?? '')
            );
            const myNick = me?.nickname || me?.name || '';
            if (myNick && sameNickname(myNick, authorNickname)) {
              owned = true;
            }
          } catch {
            // ignore
          }
        }

        // 4) (옵션) 라우트 힌트로 강제 소유자 지정 허용 (테스트/이행용)
        if (!owned && coerceTrue(routeParams?.isOwner)) {
          owned = true;
        }

        if (mounted) setIsOwner(!!owned);
      } catch {
        if (mounted) setIsOwner(false);
      }
    })();

    // 작성자 정보가 바뀔 때마다 재계산
  }, [authorId, authorEmail, authorNickname, routeParams?.isOwner]);

  return { isAdmin, isOwner };
}
