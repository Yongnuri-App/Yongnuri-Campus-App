import { api } from './client';

// ----- 타입 -----
export type LoginReq  = { email: string; password: string };
export type LoginRes  = { accessToken: string; refreshToken: string };

export type EmailReq  = { email: string };
export type VerifyReq = { email: string; number: string };
export type JoinReq   = {
  email: string;
  name: string;
  major: string;        // 백엔드 명세: major (학과)
  nickname: string;
  password: string;
  passwordCheck: string;
  studentId?: string; // 서버가 받으면 추가
};
export type ResetPasswordReq = {
  email: string;
  password: string;
  passwordCheck: string;
};
export const resetPassword = (body: ResetPasswordReq) =>
  api.post('/auth/resetPassword', body);

// ----- 개별 함수(원하면 직접 import해서 써도 됨) -----
export const requestEmailCode = (body: EmailReq)     => api.post('/auth/email', body);
export const verifyEmailCode  = (body: VerifyReq)    => api.post('/auth/verify', body);
export const join             = (body: JoinReq)      => api.post('/auth/join', body);
export const login            = (body: LoginReq)     => api.post<LoginRes>('/auth/login', body);
export const me               = ()                   => api.get('/users/me');

/** ✅ 계정 탈퇴 */
export const deleteAccount = async (accessToken?: string) => {
  const headers: Record<string, string> = {};
  const body: Record<string, string> = {};

  // accessToken을 헤더와 body 둘 다 안전하게 전달
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    body.accessToken = accessToken;
  }

  return api.post('/auth/deleteAccount', body, { headers });
};

// ====== 관리자: 회원 정보 보기 ======
export type AdminUserInfo = {
  id: number;
  name: string;
  userNickname: string | null;
  studentId: string | null;
  major: string | null;
  reportCount: number;  // 서버가 준 그대로 사용

  /** ▼ 응답에 있을 수도 있는 상태 필드들(있으면 프론트에서 사용) */
  status?: string | number | null;
  authStatus?: string | number | null;
  userStatus?: string | number | null;
};

/** 관리자 회원 정보 목록 */
export const getAdminUserInfo = () =>
  api.get<AdminUserInfo[]>('/admin/userInfo');

// ----- 호환용 객체(export된 멤버 'authApi') -----
export const authApi = {
  requestEmailCode: (body: EmailReq) => api.post('/auth/email', body),
  verifyEmailCode: (body: VerifyReq) => api.post('/auth/verify', body),
  join: (body: JoinReq) => api.post('/auth/join', body),
  login,
  me,
  resetPassword,

  /** ✅ 계정 탈퇴 */
  deleteAccount: (accessToken?: string) => deleteAccount(accessToken),

  mypage: () => api.get('/mypage'),

  /** 닉네임 수정: 명세상 body에 accessToken, nickName */
  updateMypage: (body: { accessToken?: string; nickName: string }) =>
    api.post('/mypage', body),

  /** ✅ 관리자: 회원 정보 목록 */
  adminUserInfo: () => api.get<AdminUserInfo[]>('/admin/userInfo'),
} as const;
