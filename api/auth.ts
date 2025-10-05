// /api/auth.ts
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
  // studentId?: string; // 서버가 받으면 추가
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

// ----- 호환용 객체(export된 멤버 'authApi') -----
export const authApi = {
  requestEmailCode,
  verifyEmailCode,
  join,
  login,
  me,
  resetPassword, 
} as const;
