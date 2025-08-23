// components/FloatingButton/FloatingWriteButton.tsx
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { RootStackParamList } from "../../types/navigation";
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handlePress = () => {
    if (onPressOverride) return onPressOverride();

    switch (activeTab) {
      case "market":
        navigation.navigate("SellItem");           // 기존 그대로
        break;
      case "lost":
        navigation.navigate("LostPost");     // 분실물 작성 화면으로 이동
        break;
      case "chat":
        break;
      case 'group':
        navigation.navigate("GroupBuyRecruit");
        break;
      case "notice":
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
      <View style={styles.contentRow}>
        <Image source={require("../../assets/images/plus.png")} style={styles.icon} resizeMode="contain" />
        <Text style={styles.label}>글쓰기</Text>
      </View>
    </TouchableOpacity>
  );
}
