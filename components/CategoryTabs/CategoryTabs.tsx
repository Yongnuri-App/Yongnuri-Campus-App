import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import styles from './CategoryTabs.styles';

export type CategoryTab = {
  key: string;
  label: string;
};

type Props = {
  tabs: CategoryTab[];
  value: string;
  onChange: (key: string) => void;
  containerStyle?: ViewStyle;
  activeColor?: string;    // default: #2563EB
  inactiveColor?: string;  // default: #B0B0B0
  underlineColor?: string; // default: #2563EB
  bottomBorder?: boolean;  // default: true
};

export default function CategoryTabs({
  tabs,
  value,
  onChange,
  containerStyle,
  activeColor = '#2563EB',
  inactiveColor = '#B0B0B0',
  underlineColor = '#2563EB',
  bottomBorder = true,
}: Props) {
  const width = Dimensions.get('window').width;
  const count = Math.max(1, tabs.length);
  const tabWidth = width / count;

  const activeIndex = useMemo(
    () => Math.max(0, tabs.findIndex(t => t.key === value)),
    [tabs, value]
  );

  const anim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: activeIndex,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, anim]);

  // 밑줄은 탭 너비의 36% 정도로 짧게, 중앙 정렬
  const underlineW = tabWidth * 1;
  const underlineL = Animated.multiply(anim, tabWidth).interpolate({
    inputRange: [0, tabWidth],
    outputRange: [0, tabWidth],
  });

  return (
    <View
      style={[
        styles.container,
        bottomBorder && styles.bottomBorder,
        containerStyle,
      ]}
    >
      <View style={styles.row}>
        {tabs.map((t, i) => {
          const active = i === activeIndex;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, { width: tabWidth }]}
              onPress={() => onChange(t.key)}
              android_ripple={{ color: '#eee' }}
              accessibilityRole="button"
              accessibilityLabel={`${t.label} 탭`}
            >
              <Text
                style={[
                  styles.label,
                  { color: active ? activeColor : inactiveColor },
                  active && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 밑줄 */}
      <Animated.View
        style={[
          styles.underline,
          {
            width: underlineW,
            backgroundColor: underlineColor,
            transform: [
              {
                translateX: Animated.add(
                  underlineL,
                  new Animated.Value((tabWidth - underlineW) / 2)
                ),
              },
            ],
          },
        ]}
      />
    </View>
  );
}
