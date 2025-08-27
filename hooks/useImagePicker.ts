// hooks/useImagePicker.ts
// React Native(Expo)에서 갤러리/파일 앱에서 이미지를 선택하는 공통 로직을 훅으로 분리
// - 권한 요청, iOS 액션시트/Android Alert, 최대 개수 제한, 삭제 기능 포함
// - UI는 PhotoPicker가 담당, 훅은 "행동"만 담당

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

type UseImagePickerOptions = {
  /** 최대 허용 이미지 수 (기본 10) */
  max?: number;
  /** 외부에서 초기값을 넣고 싶을 때 */
  initial?: string[];
};

export function useImagePicker(opts: UseImagePickerOptions = {}) {
  const max = opts.max ?? 10;

  // 선택된 이미지 URI 배열을 이 훅 내부에서 관리
  const [images, setImages] = useState<string[]>(opts.initial ?? []);

  // 외부 initial이 "참조"가 바뀔 때만 주입 (JSON.stringify 의존 제거 → 불필요한 재실행/루프 방지)
  const initialRef = useRef<string[] | undefined>(opts.initial);
  useEffect(() => {
    if (opts.initial && opts.initial !== initialRef.current) {
      initialRef.current = opts.initial;
      setImages(opts.initial);
    }
  }, [opts.initial]);

  // 현재 추가 가능한 남은 개수
  const remain = Math.max(0, max - images.length);

  // SDK 호환: 최신(SDK 50+)은 MediaType 배열, 구버전은 MediaTypeOptions 사용
  const mediaTypesCompat: any = (() => {
    const anyPicker = ImagePicker as any;
    // 최신 Expo에선 MediaType이 존재
    if (anyPicker?.MediaType?.Image) {
      return [anyPicker.MediaType.Image]; // ✅ 권장 방식
    }
    // 구버전 호환 (경고가 뜨는 SDK에선 위 분기 탑니다)
    return (ImagePicker as any).MediaTypeOptions?.Images ?? anyPicker.MediaTypeOptions?.Images;
  })();

  /** (내부) 갤러리에서 선택 */
  const pickFromLibrary = useCallback(async () => {
    try {
      // 갤러리 권한 요청
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진 보관함 접근 권한을 허용해주세요.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesCompat,
        allowsMultipleSelection: remain > 1,         // 남은 수가 2장 이상이면 멀티 허용
        selectionLimit: remain > 1 ? remain : 1,     // (지원 SDK에서만 사용됨)
        quality: 1,
      } as any);

      if ((res as any).canceled) return;

      const assets = (res as any).assets ?? [];
      if (!assets.length) return;

      // 남은 개수만큼만 추가
      const uris = assets.map((a: any) => a.uri).slice(0, remain);
      if (uris.length) setImages(prev => [...prev, ...uris]);
    } catch (e) {
      console.log('pickFromLibrary error', e);
      Alert.alert('오류', '사진을 불러오지 못했어요.');
    }
  }, [remain, mediaTypesCompat]);

  /** (내부) 파일 앱에서 이미지 선택 */
  const pickFromFiles = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: remain > 1,
        copyToCacheDirectory: true,
      } as any);

      if ((res as any).canceled) return;

      const assets = (res as any).assets ?? [];
      if (!assets.length) return;

      // 이미지 MIME만 허용
      const chosen = assets
        .filter((a: any) => !a?.mimeType || String(a.mimeType).startsWith('image/'))
        .map((a: any) => a.uri);

      const toAdd = chosen.slice(0, remain);
      if (toAdd.length) setImages(prev => [...prev, ...toAdd]);
    } catch (e) {
      console.log('pickFromFiles error', e);
      Alert.alert('오류', '파일을 불러오지 못했어요.');
    }
  }, [remain]);

  /** [+] 버튼 눌렀을 때 진입점 (iOS: 액션시트 / Android: Alert) */
  const openAdd = useCallback(() => {
    if (remain <= 0) {
      Alert.alert('알림', `사진은 최대 ${max}장까지 업로드할 수 있어요.`);
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['사진 보관함에서 선택', '파일에서 선택', '취소'],
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) pickFromLibrary();
          if (idx === 1) pickFromFiles();
        }
      );
    } else {
      Alert.alert('사진 추가', '추가 방법을 선택해주세요.', [
        { text: '사진 보관함', onPress: () => pickFromLibrary() },
        { text: '파일', onPress: () => pickFromFiles() },
        { text: '취소', style: 'cancel' },
      ]);
    }
  }, [remain, max, pickFromLibrary, pickFromFiles]);

  /** 인덱스로 삭제 */
  const removeAt = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    // 상태
    images,
    setImages,     // 외부(드래프트 복원 등)에서 직접 주입이 필요할 때 사용
    max,
    remain,

    // 액션
    openAdd,
    removeAt,
    pickFromLibrary,
    pickFromFiles,
  };
}

export default useImagePicker;
