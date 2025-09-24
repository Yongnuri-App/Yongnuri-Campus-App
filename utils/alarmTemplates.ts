// utils/alarmTemplates.ts
export type ReportApprovedPayload = { postTitle?: string; reasonType?: string };
type ReportTpl = { title: string; description: string; reportIcon?: true };

export function makeReportApprovedTemplate(p: ReportApprovedPayload): ReportTpl {
  const postFrag = p?.postTitle ? `「${p.postTitle}」` : '해당 게시글';
  const reasonFrag = p?.reasonType ? ` (사유: ${p.reasonType})` : '';
  return {
    title: '신고 처리 결과 안내',            // ← [관리자] 제거
    description:
      `${postFrag}이(가) 신고 기준에 따라 삭제되었습니다${reasonFrag}. ` +
      '운영정책을 위반하는 게시물은 사전 통보 없이 삭제될 수 있습니다.',
    reportIcon: true,                        // ← 아이콘 플래그
  };
}

export function makeReportRejectedTemplate(p?: { postTitle?: string }): ReportTpl {
  const postFrag = p?.postTitle ? `「${p.postTitle}」` : '해당 게시글';
  return {
    title: '신고 처리 결과 안내',
    description:
      `${postFrag}에 대한 신고가 검토 결과, 운영정책 위반 사항이 확인되지 않아 조치하지 않았습니다.`,
    reportIcon: true,                        // ← 아이콘 플래그
  };
}
