// hooks/useImageViewer.ts
import { useCallback, useState } from 'react';

/**
 * 상세 페이지 등에서 이미지 클릭 시 전체화면 뷰어를 열기 위한 공용 훅
 * - openAt(index): 특정 인덱스에서 뷰어 오픈
 * - close(): 뷰어 닫기
 * - startIndex: 현재 시작 인덱스
 * - visible: 뷰어 노출 여부
 */
export function useImageViewer() {
  const [visible, setVisible] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const openAt = useCallback((idx: number) => {
    setStartIndex(idx);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  return { visible, startIndex, openAt, close };
}
