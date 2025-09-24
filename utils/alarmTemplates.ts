// utils/alarmTemplates.ts
export type ReportApprovedPayload = { postTitle?: string; reasonType?: string };
type ReportTpl = { title: string; description: string; reportIcon?: true };

// ✅ 신고 '인정' 안내
export function makeReportApprovedTemplate(p: ReportApprovedPayload): ReportTpl {
  const postFrag = p?.postTitle ? `「${p.postTitle}」` : '해당 게시글';
  const reasonFrag = p?.reasonType ? ` (사유: ${p.reasonType})` : '';
  return {
    title: '신고 처리 결과 안내', // [관리자] 제거
    description:
      `${postFrag}이(가) 신고 기준에 따라 삭제되었습니다${reasonFrag}. ` +
      '운영정책을 위반하는 게시물은 사전 통보 없이 삭제될 수 있습니다.',
    reportIcon: true,          // 신고성 알림 → 빨간 아이콘
  };
}

// ✅ 신고 '미인정' 안내
export function makeReportRejectedTemplate(p?: { postTitle?: string }): ReportTpl {
  const postFrag = p?.postTitle ? `「${p.postTitle}」` : '해당 게시글';
  return {
    title: '신고 처리 결과 안내',
    description:
      `${postFrag}에 대한 신고가 검토 결과, 운영정책 위반 사항이 확인되지 않아 조치하지 않았습니다.`,
    reportIcon: true,          // 신고성 알림 → 빨간 아이콘
  };
}

/* ───────────────────────────────────
 * ✅ 누적 경고 템플릿(5회, 9회)
 *  - 신고 관련 알림이므로 reportIcon=true
 * ─────────────────────────────────── */
export function makeReportWarn5Template(): ReportTpl {
  return {
    title: '신고 누적 경고 안내',
    description:
      '회원님의 게시물이 신고 누적 5회에 도달했습니다. ' +
      '운영정책 위반이 지속될 경우 누적 10회 시 계정이 자동 탈퇴 처리됩니다. ' +
      '커뮤니티 가이드를 확인하고 게시물·활동을 점검해주세요.',
    reportIcon: true,
  };
}

export function makeReportWarn9Template(): ReportTpl {
  return {
    title: '신고 누적 경고 안내',
    description:
      '회원님의 게시물이 신고 누적 9회입니다. ' +
      '한 번 더 신고가 인정되면 누적 10회로 자동 탈퇴 처리됩니다. ' +
      '즉시 게시물과 활동을 점검해주세요.',
    reportIcon: true,
  };
}
