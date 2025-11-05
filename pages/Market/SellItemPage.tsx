// pages/Market/SellItemPage.tsx
import { CommonActions, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { uploadImages } from '@/api/images';
import { toAbsoluteUrl } from '@/api/url';
import type { UpdateMarketPostReq } from '../../api/market';
import { createMarketPost, getMarketPost, updateMarketPost } from '../../api/market';
import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import { useImagePicker } from '../../hooks/useImagePicker';
import type { CreateMarketPostReq } from '../../types/market';
import { getCurrentUserEmail } from '../../utils/currentUser';
import styles from './SellItemPage.styles';

type SaleMode = 'sell' | 'donate' | null;

const MAX_IMAGES = 10;
const TITLE_MAX = 50;
const DESC_MAX = 1000;

/** 금액 포맷 함수 */
const formatKRW = (digits: string) => {
  if (!digits) return '';
  const n = Number(digits);
  if (Number.isNaN(n)) return '';
  return `₩ ${n.toLocaleString('ko-KR')}`;
};

const SellItemPage: React.FC<{ navigation?: any }> = ({ navigation }) => {
  // 라우트 파라미터: create | edit / id
  const route = useRoute<any>();
  const modeParam = route.params?.mode as 'create' | 'edit' | undefined;
  const editId = route.params?.id as string | number | undefined;
  const isEdit = modeParam === 'edit' && !!editId;

  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX_IMAGES });
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [mode, setMode] = useState<SaleMode>(null);
  const [priceRaw, setPriceRaw] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [saleStatus, setSaleStatus] = useState<'SELLING' | 'RESERVED' | 'SOLD'>('SELLING');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  /** ✅ 이탈 방지 우회 ref (동기 판정용) */
  const bypassGuardRef = useRef(false);

  const isDonation = mode === 'donate';
  const isSell = mode === 'sell';
  const priceDisplay = useMemo(() => formatKRW(priceRaw), [priceRaw]);

  /** 작성 가능 여부 */
  const canSubmitCreate = useMemo(() => {
    if (!title.trim() || !desc.trim() || !location.trim() || !mode) return false;
    if (mode === 'sell') {
      const n = Number(priceRaw);
      if (!Number.isFinite(n) || n <= 0) return false;
    }
    return true;
  }, [title, desc, location, mode, priceRaw]);

  /** 작성 중 여부 */
  const isDirty = useMemo(() => {
    return (
      !!title.trim() ||
      !!desc.trim() ||
      mode !== null ||
      !!priceRaw.trim() ||
      !!location.trim() ||
      images.length > 0
    );
  }, [title, desc, mode, priceRaw, location, images]);

  /** 뒤로가기 */
  const goBack = () => {
    if (navigation?.goBack) return navigation.goBack();
  };

  /** 거래 방식 변경 */
  const handleChangeMode = (next: SaleMode) => {
    setMode(next);
    if (next === 'donate') setPriceRaw('');
  };

  /** 작성 중 이탈 방지 */
  useEffect(() => {
    const sub = navigation?.addListener?.('beforeRemove', (e: any) => {
      // ✅ 저장/이동 과정에서는 가드 비활성화 (ref는 동기적으로 즉시 반영됨)
      if (bypassGuardRef.current) return;

      if (!isDirty || submitting) return;
      e.preventDefault();
      Alert.alert('작성 중', '작성 중인 내용이 사라집니다. 나가시겠어요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            setImages([]);
            setTitle('');
            setDesc('');
            setMode(null);
            setPriceRaw('');
            setLocation('');
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return () => sub && sub();
  }, [isDirty, submitting, navigation, setImages]);

  /** ====== 수정 모드일 때 상세 불러와서 폼 주입 ====== */
  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        console.log('[SellItemPage] load detail for edit id=', editId);
        const detail = await getMarketPost(editId as string);
        console.log('[SellItemPage] detail =', detail);

        // 서버 스펙 기준 매핑
        const d = detail || {};
        const _images: string[] = Array.isArray(d.images)
          ? d.images
              .slice()
              .sort((a: any, b: any) => (a?.sequence ?? 0) - (b?.sequence ?? 0))
              .map((it: any) => toAbsoluteUrl(it?.imageUrl)!)
              .filter(Boolean)
          : (d.thumbnailUrl ? [toAbsoluteUrl(d.thumbnailUrl)!] : []);

        if (!mounted) return;
        setTitle(d.title ?? '');
        setDesc(d.content ?? '');
        setLocation(d.location ?? '');
        setSaleStatus((d.status as any) ?? 'SELLING');

        const priceNum = Number(d.price ?? 0);
        const nextMode: SaleMode = priceNum === 0 ? 'donate' : 'sell';
        setMode(nextMode);
        setPriceRaw(nextMode === 'donate' ? '' : String(priceNum));
        if (_images.length) setImages(_images);
      } catch (e: any) {
        console.log('[SellItemPage] load detail error', e?.response?.data || e);
        Alert.alert('오류', '게시글 정보를 불러오지 못했어요.', [
          { text: '확인', onPress: () => navigation.goBack?.() },
        ]);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isEdit, editId, navigation, setImages]);

  /** 등록 (API 연결) */
  const handleSubmitCreate = async () => {
    if (!canSubmitCreate || submitting) return;
    setSubmitting(true);
    try {
      const email = await getCurrentUserEmail();
      if (!email) {
        Alert.alert('로그인이 필요합니다.');
        return;
      }

      const method = mode === 'donate' ? 'DONATE' : 'SELL';
      const priceNum = mode === 'donate' ? 0 : Number(priceRaw);

      // 🔁 이미지 정규화: 로컬은 업로드, 원격은 절대 URL 유지
      const localUris = images.filter(u => u.startsWith('file://') || u.startsWith('content://'));
      const remoteUris = images.filter(u => !u.startsWith('file://') && !u.startsWith('content://'));
      let uploaded: string[] = [];
      if (localUris.length) {
        uploaded = await uploadImages(localUris); // 서버가 접근 가능한 URL 배열 반환(상대/절대 상관없음)
      }
      const finalImageUrls = [...remoteUris.map(u => toAbsoluteUrl(u)!), ...uploaded];

      const payload: CreateMarketPostReq = {
        title: title.trim(),
        content: desc.trim(),
        imageUrls: finalImageUrls, // ★ 서버 URL만 전송
        method,
        location: location.trim(),
        price: priceNum,
        status: 'SELLING',
      };

      console.log('[SellItemPage] submit payload(final)', payload);

      const res = await createMarketPost(payload);
      console.log('[SellItemPage] created post_id =', res?.post_id);
      Alert.alert('완료', '게시글이 등록되었습니다.');

      // 폼 초기화
      setImages([]); setTitle(''); setDesc(''); setMode(null); setPriceRaw(''); setLocation('');

      // ✅ 가드 우회 후 이동 (ref로 즉시 반영)
      bypassGuardRef.current = true;
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Main', params: { initialTab: 'market' } },
            { name: 'MarketDetail', params: { id: String(res.post_id), isOwner: true } },
          ],
        })
      );
    } catch (e: any) {
      console.log('[SellItemPage] create error', e?.response?.data || e?.message);
      const msg = e?.response?.data?.message || e?.message || '작성에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setSubmitting(false);
    }
  };

  /** 수정 (API 연결) */
  const handleSubmitEdit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const method = mode === 'donate' ? 'DONATE' : 'SELL';

      const localUris = images.filter(u => u.startsWith('file://') || u.startsWith('content://'));
      const remoteUris = images.filter(u => !u.startsWith('file://') && !u.startsWith('content://'));
      let uploaded: string[] = [];
      if (localUris.length) {
        uploaded = await uploadImages(localUris);
      }
      const finalImageUrls = [...remoteUris.map(u => toAbsoluteUrl(u)!), ...uploaded];

      const payload: UpdateMarketPostReq = {
        title: title.trim() || undefined,
        content: desc.trim() || undefined,
        imageUrls: finalImageUrls, // ★ 정규화된 URL만
        method,
        location: location.trim() || undefined,
        price: mode === 'donate' ? 0 : Number(priceRaw || 0),
        status: saleStatus || 'SELLING',
      };

      console.log('[SellItemPage] update payload(final)', payload);

      const res = await updateMarketPost(editId as string, payload);
      console.log('[SellItemPage] updated post_id =', res.post_id);

      Alert.alert('완료', res.message || '게시글을 수정했어요.', [
        {
          text: '확인',
          onPress: () => {
            // ✅ 가드 우회 후 뒤로가기
            bypassGuardRef.current = true;
            navigation.goBack?.();
          },
        },
      ]);

      // 상세 화면이 리스너로 다시 GET 하도록 콜백 존재 시 호출
      route.params?.onEdited?.({ id: String(res.post_id) });
    } catch (e: any) {
      const errData = e?.response?.data ?? e;
      console.log('[SellItemPage] update error', errData);
      Alert.alert('오류', errData?.message || '수정에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };


  const submitLabel =
    submitting ? (isEdit ? '수정 중...' : '작성 중...') : (isEdit ? '수정 완료' : '작성 완료');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{isEdit ? '중고거래 수정' : '내 물건 팔기'}</Text>
          </View>
        </View>

        {/* 로딩 중엔 간단 표기 */}
        {loading ? (
          <View style={{ paddingVertical: 40 }}>
            <Text style={{ color: '#979797', textAlign: 'center' }}>불러오는 중...</Text>
          </View>
        ) : (
          <>
            {/* 사진 선택 */}
            <PhotoPicker
              images={images}
              max={MAX_IMAGES}
              onAddPress={openAdd}
              onRemoveAt={removeAt}
            />

            {/* 제목 */}
            <View style={styles.field}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.label}>제목</Text>
                <Text style={{ color: '#979797' }}>{title.length}/{TITLE_MAX}</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="글 제목"
                placeholderTextColor="#979797"
                value={title}
                onChangeText={setTitle}
                maxLength={TITLE_MAX}
              />
            </View>

            {/* 설명 */}
            <View style={styles.field}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.label}>설명</Text>
                <Text style={{ color: '#979797' }}>{desc.length}/{DESC_MAX}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="게시글 내용을 작성해주세요."
                placeholderTextColor="#979797"
                value={desc}
                onChangeText={setDesc}
                multiline
                textAlignVertical="top"
                maxLength={DESC_MAX}
              />
            </View>

            {/* 거래 방식 */}
            <View style={styles.field}>
              <Text style={styles.label}>거래 방식</Text>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  onPress={() => handleChangeMode('sell')}
                  style={[
                    styles.modeChip,
                    mode === 'sell' ? styles.modeChipActiveFill : styles.modeChipOutline,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      mode === 'sell' ? styles.modeChipTextLight : styles.modeChipTextDark,
                    ]}
                  >
                    판매하기
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleChangeMode('donate')}
                  style={[
                    styles.modeChip,
                    mode === 'donate' ? styles.modeChipActiveFill : styles.modeChipOutline,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      mode === 'donate' ? styles.modeChipTextLight : styles.modeChipTextDark,
                    ]}
                  >
                    나눔하기
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, !isSell && styles.inputDisabled]}
                placeholder="￦ 0"
                placeholderTextColor="#979797"
                value={priceDisplay}
                onChangeText={(t) => {
                  const onlyDigits = t.replace(/[^\d]/g, '');
                  const normalized = onlyDigits.replace(/^0+(\d)/, '$1');
                  setPriceRaw(normalized);
                }}
                editable={!isDonation}
                keyboardType="number-pad"
              />
            </View>

            {/* 거래 희망 장소 */}
            <LocationPicker
              value={location}
              onChange={setLocation}
              placeholder="장소를 선택해 주세요."
            />

            <View style={styles.submitSpacer} />
          </>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.submitWrap}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              opacity:
                (isEdit ? !submitting : (canSubmitCreate && !submitting)) ? 1 : 0.6,
            },
          ]}
          activeOpacity={(isEdit ? !submitting : (canSubmitCreate && !submitting)) ? 0.9 : 1}
          onPress={isEdit ? handleSubmitEdit : handleSubmitCreate}
          disabled={isEdit ? submitting : (!canSubmitCreate || submitting)}
        >
          <Text style={styles.submitText}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SellItemPage;
