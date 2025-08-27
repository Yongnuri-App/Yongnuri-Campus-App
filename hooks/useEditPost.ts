// hooks/useEditPost.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/** ====== 기본(공동구매) 타입 ====== */
export type RecruitMode = 'unlimited' | 'limited' | null;
export type GroupBuyPost = {
  id: string;
  title: string;
  description: string;
  recruit: { mode: RecruitMode; count: number | null };
  applyLink: string;
  images: string[];
  likeCount: number;
  createdAt: string;
  authorId?: string | number;
  authorName?: string;
  authorDept?: string;
  authorEmail?: string | null;
};

/** ====== 기본(공동구매) 폼 모델 ====== */
export type DefaultGroupBuyForm = {
  title: string;
  desc: string;
  mode: RecruitMode;   // 'unlimited' | 'limited' | null
  count: string;       // 문자열로 보관
  applyLink: string;
  imagesText: string;  // 쉼표 구분 저장용
  /** 어댑터가 추가 필드를 쓰고 싶으면 여기에 담아서 사용 */
  extra?: Record<string, any>;
};

/** ====== 범용 어댑터 ======
 * - deserialize: 저장된 post -> 폼 상태
 * - serialize:   폼 상태 -> 저장될 post
 * - validate:    폼 상태 유효성 (없으면 기본검증)
 */
export type EditAdapters<TPost, TForm> = {
  deserialize: (post: TPost) => TForm;
  serialize: (prev: TPost, form: TForm) => TPost;
  validate?: (form: TForm) => boolean;
};

type UseEditPostParams<
  TPost = GroupBuyPost,
  TForm = DefaultGroupBuyForm
> = {
  postId: string;
  postsKey: string;
  onLoaded?: (post: TPost) => void;
  onSaved?: (post: TPost) => void;
  /** 제공 시: 이 어댑터 규칙으로 폼을 구성/저장 (분실물/중고거래 등 커스텀 스키마) */
  adapters?: EditAdapters<TPost, TForm>;
};

/** ===== 기본(공동구매) 변환기 ===== */
const defaultDeserialize = (post: GroupBuyPost): DefaultGroupBuyForm => ({
  title: post.title ?? '',
  desc: post.description ?? '',
  mode: post.recruit?.mode ?? 'unlimited',
  count: post.recruit?.count != null ? String(post.recruit.count) : '',
  applyLink: post.applyLink ?? '',
  imagesText: (post.images ?? []).join(', '),
});

const defaultSerialize = (prev: GroupBuyPost, form: DefaultGroupBuyForm): GroupBuyPost => ({
  ...prev,
  title: form.title.trim(),
  description: form.desc.trim(),
  applyLink: form.applyLink.trim(),
  images: form.imagesText
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  recruit: {
    mode: form.mode,
    count: form.mode === 'limited' ? Number(form.count) : null,
  },
});

const defaultValidate = (form: DefaultGroupBuyForm) => {
  if (!form.title.trim()) return false;
  if (!form.desc.trim()) return false;
  if (form.mode === 'limited') {
    const n = Number(form.count);
    if (!Number.isFinite(n) || n <= 0) return false;
  }
  return true;
};

/** ====== 공통 수정 훅 ====== */
export function useEditPost<
  TPost = GroupBuyPost,
  TForm = DefaultGroupBuyForm
>({
  postId,
  postsKey,
  onLoaded,
  onSaved,
  adapters,
}: UseEditPostParams<TPost, TForm>) {
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState<TPost | null>(null);

  // 폼 상태 (어댑터 유무에 따라 제네릭)
  const [form, setForm] = useState<any>(() => {
    const empty: DefaultGroupBuyForm = {
      title: '',
      desc: '',
      mode: 'unlimited',
      count: '',
      applyLink: '',
      imagesText: '',
      extra: {},
    };
    return empty;
  });

  // 콜백/어댑터 ref 보관(의존성 루프 방지)
  const onLoadedRef = useRef<typeof onLoaded>(onLoaded);
  useEffect(() => { onLoadedRef.current = onLoaded; }, [onLoaded]);

  const deserializeRef = useRef<(p: any) => any>(adapters?.deserialize as any ?? defaultDeserialize);
  const serializeRef   = useRef<(prev: any, f: any) => any>(adapters?.serialize as any ?? defaultSerialize);
  const validateRef    = useRef<((f: any) => boolean) | undefined>(adapters?.validate as any ?? defaultValidate);

  // 어댑터 객체가 새로 들어오면 ref 갱신 (옵션)
  useEffect(() => {
    if (adapters?.deserialize) deserializeRef.current = adapters.deserialize as any;
    if (adapters?.serialize)   serializeRef.current   = adapters.serialize as any;
    if (adapters?.validate)    validateRef.current    = adapters.validate as any;
  }, [adapters]);

  /** 상세 로드 */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(postsKey);
      const list: TPost[] = raw ? JSON.parse(raw) : [];
      const found = list.find((p: any) => String((p as any).id) === String(postId)) ?? null;

      if (!found) {
        Alert.alert('안내', '게시글을 찾을 수 없어요.');
        setOrigin(null);
        return;
      }

      setOrigin(found);
      const f = deserializeRef.current(found);
      setForm(f);
      onLoadedRef.current?.(found);
    } catch (e) {
      console.log('useEditPost load error', e);
      Alert.alert('오류', '게시글을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [postId, postsKey]);

  useEffect(() => { load(); }, [load]);

  /** 유효성 */
  const isValid = useMemo(() => {
    const v = validateRef.current ?? defaultValidate;
    return v(form);
  }, [form]);

  /** 저장 */
  const save = useCallback(
    async (override?: {
      images?: string[];
      applyLink?: string;
      extra?: Record<string, any>;
    }) => {
      if (!origin) return false;
      if (!isValid) {
        Alert.alert('확인', '필수 항목을 확인해 주세요.');
        return false;
      }

      try {
        const raw = await AsyncStorage.getItem(postsKey);
        const list: TPost[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((p: any) => String((p as any).id) === String(postId));
        if (idx === -1) {
          Alert.alert('오류', '원본 게시글을 찾을 수 없어요.');
          return false;
        }

        // override 반영 (공동구매/커스텀 모두 지원)
        let nextForm: any = { ...form };
        if (override?.images) nextForm.imagesText = override.images.join(', ');
        if (override?.applyLink != null) nextForm.applyLink = override.applyLink;
        if (override?.extra) nextForm.extra = { ...(form.extra ?? {}), ...override.extra };

        const next = serializeRef.current(origin as any, nextForm);
        const nextList = [...list];
        nextList[idx] = next;
        await AsyncStorage.setItem(postsKey, JSON.stringify(nextList));
        onSaved?.(next);
        return true;
      } catch (e) {
        console.log('useEditPost save error', e);
        Alert.alert('오류', '저장에 실패했어요.');
        return false;
      }
    },
    [origin, form, isValid, postsKey, postId, onSaved]
  );

  /** ===== 편의: 기본 폼과 동일한 필드 셋터 노출 ===== */
  const setTitle      = useCallback((v: string) => setForm((p: any) => ({ ...p, title: v })), []);
  const setDesc       = useCallback((v: string) => setForm((p: any) => ({ ...p, desc: v })), []);
  const setMode       = useCallback((v: RecruitMode) => setForm((p: any) => ({ ...p, mode: v })), []);
  const setCount      = useCallback((v: string) => setForm((p: any) => ({ ...p, count: v })), []);
  const setApplyLink  = useCallback((v: string) => setForm((p: any) => ({ ...p, applyLink: v })), []);
  const setImagesText = useCallback((v: string) => setForm((p: any) => ({ ...p, imagesText: v })), []);
  const setExtra      = useCallback((patch: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) =>
    setForm((p: any) => {
      const prev = (p.extra ?? {}) as Record<string, any>;
      const next = typeof patch === 'function' ? (patch as any)(prev) : patch;
      return { ...p, extra: { ...prev, ...next } };
    }), []);

  return {
    /** 상태 */
    loading,
    origin,

    /** 폼 상태 (기본/어댑터 공통) */
    title: (form as any).title as string,
    desc: (form as any).desc as string,
    mode: (form as any).mode as RecruitMode,
    count: (form as any).count as string,
    applyLink: (form as any).applyLink as string,
    imagesText: (form as any).imagesText as string,
    extra: (form as any).extra as Record<string, any> | undefined,

    /** setters */
    setTitle, setDesc, setMode, setCount, setApplyLink, setImagesText, setExtra,
    setForm, // 필요 시 전체 교체

    /** 파생 */
    isValid,

    /** 동작 */
    load,
    save,
  };
}
