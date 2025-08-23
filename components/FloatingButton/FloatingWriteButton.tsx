import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { RootStackParamList } from "../../types/navigation";
import { TabKey } from "../Bottom/BottomTabBar";
import styles from "./FloatingWriteButton.styles";

type Props = {
  /** 현재 활성화된 하단 탭(분기 처리용) */
  activeTab: TabKey;
  /** 하단 탭 높이만큼 띄우기 위한 오프셋 (기본 86 + 여유) */
  bottomOffset?: number;
  /** 필요 시 비활성화 처리 */
  disabled?: boolean;
  /** 외부에서 직접 동작을 제어하고 싶을 때(선택) */
  onPressOverride?: () => void;
};

export default function FloatingWriteButton({
  activeTab,
  bottomOffset = Platform.select({ ios: 105, android: 99 }) ?? 99,  // 기본값: iOS 105, Android 99
  disabled = false,
  onPressOverride,
}: Props) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  // ✅ 탭별 onPress 동작 (페이지 미구현이라 TODO로 남김)
  const handlePress = () => {
    if (onPressOverride) {
      onPressOverride();
      return;
    }

    // TODO: 실제 네비게이션 연결 (예: navigation.navigate('xxxWrite'))
    switch (activeTab) {
      case 'market':
        navigation.navigate("SellItem");
        break;
      case 'lost':
        navigation.navigate("LostItem");
        break;
      case 'chat':
        console.log('채팅은 글쓰기 없음');
        break;
      case 'group':
        navigation.navigate("GroupBuyRecruit");
        break;
      case 'notice':
        console.log('공지사항 글쓰기로 이동 (TODO: NoticeWritePage)');
        break;
      default:
        break;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { bottom: bottomOffset }]}
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="글쓰기"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {/* 아이콘 + 텍스트 그룹 */}
      <View style={styles.contentRow}>
        <Image
          source={require('../../assets/images/plus.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.label}>글쓰기</Text>
      </View>
    </TouchableOpacity>
  );
}