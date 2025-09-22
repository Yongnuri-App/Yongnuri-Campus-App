// components/FloatingButton/FloatingWriteButton.tsx
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { TabKey } from "../Bottom/BottomTabBar";
import styles from "./FloatingWriteButton.styles";

type Props = {
  activeTab: TabKey;
  bottomOffset?: number;
  disabled?: boolean;
  onPressOverride?: () => void;
};

export default function FloatingWriteButton({
  activeTab,
  bottomOffset = Platform.select({ ios: 105, android: 99 }) ?? 99,
  disabled = false,
  onPressOverride,
}: Props) {
  // 🔧 타입 느슨화로 TS 오류 제거 (여기 버튼은 여러 스택에서 재사용)
  const navigation = useNavigation<any>();

  const handlePress = () => {
    if (onPressOverride) return onPressOverride();

    switch (activeTab) {
      case "market":
        navigation.navigate("SellItem");
        break;
      case "lost":
        navigation.navigate("LostPost");
        break;
      case "group":
        navigation.navigate("GroupBuyRecruit");
        break;
      case "notice":
        // ✅ 관리자용: 공지사항 등록 페이지로 이동
        navigation.navigate("AdminNoticeCreate");
        break;
      case "chat":
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
      <View style={styles.contentRow}>
        <Image
          source={require("../../assets/images/plus.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.label}>글쓰기</Text>
      </View>
    </TouchableOpacity>
  );
}
