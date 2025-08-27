import useKeyboardHeight from '@/hooks/useKeyboardHeight';
import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './AttachmentBar.styles';

type Props = {
  uris: string[];
  onRemoveAt: (index: number) => void;
  inputBarHeight?: number;
  gapAboveInput?: number;
};

export default function AttachmentBar({
  uris,
  onRemoveAt,
  inputBarHeight = 50,
  gapAboveInput = 0,
}: Props) {
  // ✅ 훅은 항상 호출
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 0);

  const bottom = useMemo(
    () => keyboardHeight + inputBarHeight + safeBottom + gapAboveInput,
    [keyboardHeight, inputBarHeight, safeBottom, gapAboveInput]
  );

  // ✅ 훅 호출 후에 분기
  if (!uris?.length) return null;

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom }]}>
      <View style={styles.attachBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachScroll}
        >
          {uris.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.thumbWrapAttach}>
              <Image source={{ uri }} style={styles.thumbAttach} />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemoveAt(idx)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeX}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
