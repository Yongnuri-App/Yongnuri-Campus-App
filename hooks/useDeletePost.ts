// hooks/useDeletePost.ts
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { deleteBoardPost, PostType } from '@/api/board';

type Params = {
  postId: string | number;
  postsKey: string;             // 예: 'market_posts_v1' | 'lost_found_posts_v1' ...
  likedMapKey?: string;         // 예: 'market_liked_map_v1'
  navigation: any;

  confirmTitle?: string;
  confirmMessage?: string;
  confirmOkText?: string;
  confirmCancelText?: string;
};

function resolvePostTypeByKey(key: string): PostType {
  if (key === 'market_posts_v1') return 'USED_ITEM';
  if (key === 'lost_found_posts_v1') return 'LOST_ITEM';
  if (key === 'groupbuy_posts_v1') return 'GROUP_BUY';
  if (key === 'notice_posts_v1') return 'NOTICE';
  // 기본값
  return 'USED_ITEM';
}

// ✅ 삭제 후 돌아갈 메인 탭도 게시판에 맞춰 동적으로 결정
function resolveInitialTabByKey(key: string): 'market' | 'lost' | 'group' | 'notice' {
  if (key === 'market_posts_v1') return 'market';
  if (key === 'lost_found_posts_v1') return 'lost';
  if (key === 'groupbuy_posts_v1') return 'group';
  if (key === 'notice_posts_v1') return 'notice';
  return 'market';
}

async function removeFromLocalList(postsKey: string, id: string | number) {
  const raw = await AsyncStorage.getItem(postsKey);
  const list = raw ? JSON.parse(raw) : [];
  const next = Array.isArray(list)
    ? list.filter((p: any) => String(p?.id) !== String(id))
    : [];
  await AsyncStorage.setItem(postsKey, JSON.stringify(next));
}

async function removeFromLikedMap(likedMapKey?: string, id?: string | number) {
  if (!likedMapKey || id == null) return;
  const raw = await AsyncStorage.getItem(likedMapKey);
  if (!raw) return;
  const map = JSON.parse(raw) || {};
  delete map[String(id)];
  await AsyncStorage.setItem(likedMapKey, JSON.stringify(map));
}

export function useDeletePost({
  postId,
  postsKey,
  likedMapKey,
  navigation,
  confirmTitle = '삭제',
  confirmMessage = '정말로 이 게시글을 삭제할까요?',
  confirmOkText = '삭제',
  confirmCancelText = '취소',
}: Params) {
  const doDelete = async () => {
    try {
      const postType = resolvePostTypeByKey(postsKey);
      console.log('[Delete] try', { postId, postType, postsKey });

      // 1) 서버 삭제
      await deleteBoardPost(postType, postId);

      // 2) 로컬 동기화
      await removeFromLocalList(postsKey, postId);
      await removeFromLikedMap(likedMapKey, postId);

      // 3) 메인으로 복귀 (게시판별 탭 유지)
      const tab = resolveInitialTabByKey(postsKey);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', params: { initialTab: tab } }],
        })
      );

      Alert.alert('완료', '게시글이 삭제되었습니다.');
    } catch (e: any) {
      const errData = e?.response?.data ?? e;
      console.log('[Delete] error', errData);
      Alert.alert('오류', errData?.message || '삭제에 실패했어요.');
    }
  };

  const confirmAndDelete = () => {
    Alert.alert(confirmTitle, confirmMessage, [
      { text: confirmCancelText, style: 'cancel' },
      { text: confirmOkText, style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  return { confirmAndDelete };
}

export default useDeletePost;
