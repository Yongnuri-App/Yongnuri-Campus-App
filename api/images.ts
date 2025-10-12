import { api } from './client';

/**
 * 로컬 이미지 URI 배열을 멀티파트로 업로드하고 서버가 반환한 imageUrls 배열을 돌려준다.
 * - POST /api/images/upload
 * - Form field: "images"
 * - Response: { imageUrls: string[] }
 */
export async function uploadImages(fileUris: string[], fieldName = 'images'): Promise<string[]> {
  // 1) FormData 구성 (파일 객체 안에 name 포함)
  const form = new FormData();

  fileUris.forEach((uri, i) => {
    // filename 추출
    const filename = (uri.split('/').pop() || `image_${i}.jpg`).replace(/\?.*$/, '');
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();

    // 간단 MIME 추정
    const type =
      ext === 'png'  ? 'image/png'  :
      ext === 'webp' ? 'image/webp' :
      ext === 'gif'  ? 'image/gif'  :
      'image/jpeg';

    // ✅ 파일 객체 안에 name 포함 (중요)
    const file: any = { uri, type, name: filename };

    // ✅ 같은 키(fieldName)로 여러 번 append → Spring @RequestParam("images") List<MultipartFile>
    form.append(fieldName, file);
  });

  // 디버깅용: 텍스트 파트 하나 추가해 multipart 확실히 강제 (서버에 영향 없음)
  form.append('meta', 'rn');

  // 2) axios 시도 (Content-Type은 지정하지 말 것! boundary 자동)
  try {
    const { data } = await api.post<{ imageUrls: string[] }>(
      '/api/images/upload',
      form
    );
    return data.imageUrls ?? [];
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '';
    // 3) 특정 에러(필드 없다고 나오면)에는 fetch로 폴백
    if (/Required part 'images' is not present/i.test(msg) || /multipart/i.test(msg)) {
      console.log('[uploadImages] axios failed, fallback to fetch…');

      const res = await fetch(api.defaults.baseURL + '/api/images/upload', {
        method: 'POST',
        // ❗ fetch도 Content-Type을 직접 지정하지 않음 (boundary 자동)
        headers: {
          ...(api.defaults.headers.common.Authorization
            ? { Authorization: String(api.defaults.headers.common.Authorization) }
            : {}),
          Accept: 'application/json',
        },
        body: form,
      });

      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* noop */ }

      if (!res.ok) {
        // 서버 에러 그대로 던지기
        throw json || { status: res.status, message: text || 'Upload failed' };
      }
      return json?.imageUrls ?? [];
    }

    // 폴백 조건 아니면 원래 에러 전달
    throw err;
  }
}
