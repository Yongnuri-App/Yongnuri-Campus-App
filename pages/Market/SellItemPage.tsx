// pages/Market/SellItemPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
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

import LocationPicker from '../../components/LocationPicker/LocationPicker';
import PhotoPicker from '../../components/PhotoPicker/PhotoPicker';
import styles from './SellItemPage.styles';

// 커스텀 훅
import useImagePicker from '../../hooks/useImagePicker';

// 판매/나눔 모드 타입
type SaleMode = 'sell' | 'donate' | null;

interface Props {
  navigation?: any;
}

const DRAFT_KEY = 'sell_item_draft_v1';
const POSTS_KEY = 'market_posts_v1';
const MAX_IMAGES = 10;

/** 숫자만 받은 뒤 "₩ 12,345" 형태로 보여주기 */
const formatKRW = (digits: string) => {
  if (!digits) return '';
  const n = Number(digits);
  if (Number.isNaN(n)) return '';
  return `₩ ${n.toLocaleString('ko-KR')}`;
};

const SellItemPage: React.FC<Props> = ({ navigation }) => {
  // ✅ 사진은 훅이 관리 (UI는 PhotoPicker)
  const { images, setImages, openAdd, removeAt } = useImagePicker({ max: MAX_IMAGES });

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [mode, setMode] = useState<SaleMode>(null);
  const [priceRaw, setPriceRaw] = useState<string>(''); // 숫자만
  const [location, setLocation] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // '나가기' 시 자동저장 스킵을 위한 플래그/타이머
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSaveRef = useRef(false);

  const isDonation = useMemo(() => mode === 'donate', [mode]);
  const isSell = useMemo(() => mode === 'sell', [mode]);
  const priceDisplay = useMemo(() => formatKRW(priceRaw), [priceRaw]);

  /** 폼 유효성 (작성 완료 버튼 활성/비활성) */
  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!desc.trim()) return false;
    if (mode === null) return false;
    if (mode === 'sell' && !priceRaw.trim()) return false;
    if (!location.trim()) return false;
    return true;
  }, [title, desc, mode, priceRaw, location]);

  /** 작성 중 여부(이탈 방지) */
  const isDirty = useMemo(() => {
    return (
      images.length > 0 ||
      !!title.trim() ||
      !!desc.trim() ||
      mode !== null ||
      !!priceRaw.trim() ||
      !!location.trim()
    );
  }, [images, title, desc, mode, priceRaw, location]);

  /** 뒤로가기 */
  const goBack = () => {
    if (navigation?.goBack) return navigation.goBack();
    Alert.alert('뒤로가기', '네비게이션이 연결되어 있지 않습니다.');
  };

  /** 모드 변경 */
  const handleChangeMode = (next: SaleMode) => {
    setMode(next);
    if (next === 'donate') setPriceRaw(''); // 나눔 전환 시 가격 초기화
  };

  /** ⬇️⬇️ 초안 복원: 훅의 setImages 사용 ⬇️⬇️ */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (Array.isArray(d?.images)) setImages(d.images);
        if (typeof d?.title === 'string') setTitle(d.title);
        if (typeof d?.desc === 'string') setDesc(d.desc);
        if (d?.mode === 'sell' || d?.mode === 'donate') setMode(d.mode);
        if (typeof d?.priceRaw === 'string') setPriceRaw(d.priceRaw);
        if (typeof d?.location === 'string') setLocation(d.location);
      } catch (e) {
        console.log('draft load fail', e);
      }
    })();
  }, [setImages]);

  /** 초안 저장(디바운스 300ms) */
  useEffect(() => {
    if (skipSaveRef.current) return; // '나가기' 선택 이후 저장 스킵
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const draft = { images, title, desc, mode, priceRaw, location };
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.log('draft save fail', e);
      }
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [images, title, desc, mode, priceRaw, location]);

  /** 이탈 방지 + '나가기' 시 드래프트 삭제/리셋 */
  useEffect(() => {
    const sub = navigation?.addListener?.('beforeRemove', (e: any) => {
      if (!isDirty || submitting) return;
      e.preventDefault();
      Alert.alert('작성 중', '작성 중인 내용이 사라집니다. 나가시겠어요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              // 이후 자동 저장 막기
              skipSaveRef.current = true;
              if (saveTimer.current) clearTimeout(saveTimer.current);
              // 드래프트 삭제
              await AsyncStorage.removeItem(DRAFT_KEY);
              // 메모리 상태도 즉시 리셋
              setImages([]);
              setTitle('');
              setDesc('');
              setMode(null);
              setPriceRaw('');
              setLocation('');
            } finally {
              navigation.dispatch(e.data.action); // 실제 화면 이탈
            }
          },
        },
      ]);
    });
    return () => {
      if (sub) sub();
    };
  }, [isDirty, submitting, navigation, setImages]);

  /** 제출 */
  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: desc.trim(),
        mode, // 'sell' | 'donate'
        price: isDonation ? 0 : Number(priceRaw), // number
        location: location.trim(),
        images, // string[]
      };

      // 1) 로컬 '게시글 목록'에 append (최신이 위로)
      const newItem = {
        id: String(Date.now()),
        title: payload.title,
        description: payload.description,
        mode: payload.mode as 'sell' | 'donate',
        price: payload.price,
        location: payload.location,
        images: payload.images,
        likeCount: 0,
        createdAt: new Date().toISOString(),
      };

      const raw = await AsyncStorage.getItem(POSTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(list));

      // 2) 드래프트 삭제 및 알림
      await AsyncStorage.removeItem(DRAFT_KEY);
      Alert.alert('완료', '게시글이 작성되었습니다.');

      // 3) 폼/상태 리셋
      setImages([]);
      setTitle('');
      setDesc('');
      setMode(null);
      setPriceRaw('');
      setLocation('');

      // 4) 뒤로가기
      navigation?.goBack?.();
    } catch (e: any) {
      Alert.alert('오류', e?.message || '작성에 실패했어요. 잠시 후 다시 시도해주세요.');
      console.log(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Image
              source={require('../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>내 물건 팔기</Text>
          </View>
        </View>

        {/* 사진 영역 (UI만, 동작은 훅) */}
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
            <Text style={{ color: '#979797' }}>{title.length}/60</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="글 제목"
            placeholderTextColor="#979797"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </View>

        {/* 설명 */}
        <View style={styles.field}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.label}>설명</Text>
            <Text style={{ color: '#979797' }}>{desc.length}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="용누리 캠퍼스에 올릴 게시글 내용을 작성해주세요."
            placeholderTextColor="#979797"
            value={desc}
            onChangeText={setDesc}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 거래방식 + 가격 */}
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
              // 숫자만 추출 + 선행 0 제거
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
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={styles.submitWrap}>
        <TouchableOpacity
          style={[styles.submitButton, { opacity: canSubmit && !submitting ? 1 : 0.6 }]}
          activeOpacity={canSubmit && !submitting ? 0.9 : 1}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          <Text style={styles.submitText}>{submitting ? '작성 중...' : '작성 완료'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SellItemPage;
