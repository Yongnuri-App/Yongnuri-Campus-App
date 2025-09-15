// hooks/useDeletePost.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';

import { Alert } from 'react-native';

type Options = {
  /** 이 화면의 게시글 id */
  postId: string;
  /** 이 타입의 게시글이 저장된 리스트 키 (예: 'market_posts_v1') */
  postsKey: string;
  /** 선택: 좋아요 맵 키가 있으면 삭제 시 해당 id 키도 같이 정리 */
  likedMapKey?: string;

  /** 삭제 후 자동으로 뒤로가기 할지 (기본 true) */
  navigateBackOnDelete?: boolean;
  /** react-navigation 의 navigation (goBack에 사용) */
  navigation?: { goBack: () => void };

  /** 완료/실패 콜백(선택) */
  onDeleted?: () => void;
  onError?: (err: unknown) => void;

  /** 확인 다이얼로그 문구 커스터마이즈 (선택) */
  confirmTitle?: string;     // 기본: '삭제'
  confirmMessage?: string;   // 기본: '정말로 이 게시글을 삭제할까요?'
  confirmOkText?: string;    // 기본: '삭제'
  confirmCancelText?: string;// 기본: '취소'
};

export function useDeletePost({
  postId,
  postsKey,
  likedMapKey,
  navigateBackOnDelete = true,
  navigation,
  onDeleted,
  onError,
  confirmTitle = '삭제',
  confirmMessage = '정말로 이 게시글을 삭제할까요?',
  confirmOkText = '삭제',
  confirmCancelText = '취소',
}: Options) {
  const [deleting, setDeleting] = useState(false);

  /** 실제 삭제 로직 (확인 없이 바로 실행하고 싶을 때 사용) */
  const deleteNow = useCallback(async (): Promise<boolean> => {
    try {
      setDeleting(true);

      // 1) 목록에서 제거
      const raw = await AsyncStorage.getItem(postsKey);
      const list = raw ? JSON.parse(raw) : [];
      const idx = Array.isArray(list) ? list.findIndex((p: any) => p?.id === postId) : -1;
      if (idx < 0) {
        setDeleting(false);
        return false; // 이미 없음
      }
      list.splice(idx, 1);
      await AsyncStorage.setItem(postsKey, JSON.stringify(list));

      // 2) 좋아요 맵에서 정리(선택)
      if (likedMapKey) {
        try {
          const likedRaw = await AsyncStorage.getItem(likedMapKey);
          const likedMap = likedRaw ? JSON.parse(likedRaw) : {};
          if (likedMap && typeof likedMap === 'object' && postId in likedMap) {
            delete likedMap[postId];
            await AsyncStorage.setItem(likedMapKey, JSON.stringify(likedMap));
          }
        } catch {}
      }

      setDeleting(false);

      // 3) 성공 후 처리
      onDeleted?.();
      if (navigateBackOnDelete && navigation) {
        navigation.goBack();
      }
      return true;
    } catch (err) {
      setDeleting(false);
      onError?.(err);
      Alert.alert('오류', '게시글을 삭제하지 못했어요.');
      return false;
    }
  }, [postId, postsKey, likedMapKey, navigateBackOnDelete, navigation, onDeleted, onError]);

  /** 확인 다이얼로그를 띄우고 삭제 */
  const confirmAndDelete = useCallback(() => {
    Alert.alert(
      confirmTitle,
      confirmMessage,
      [
        { text: confirmCancelText, style: 'cancel' },
        {
          text: confirmOkText,
          style: 'destructive',
          onPress: () => void deleteNow(),
        },
      ],
      { cancelable: true }
    );
  }, [confirmTitle, confirmMessage, confirmOkText, confirmCancelText, deleteNow]);

  return {
    deleting,          // 삭제 중 로딩 상태
    deleteNow,         // 확인 없이 바로 삭제
    confirmAndDelete,  // 확인 후 삭제
  };
}

export default useDeletePost;
