// components/ImageViewer/FullscreenImageViewer.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import styles from './FullscreenImageViewer.styles';

type Props = {
  visible: boolean;
  images: string[];         // 일반 URL 배열
  startIndex?: number;      // 시작 인덱스
  onRequestClose: () => void;
};

/**
 * 공용 전체화면 이미지 뷰어
 * - react-native-image-viewing 래핑
 * - 하단 인디케이터(1 / N) + 닫기 버튼 커스텀
 */
export default function FullscreenImageViewer({
  visible,
  images,
  startIndex = 0,
  onRequestClose,
}: Props) {
  // 라이브러리가 요구하는 형식 [{ uri }]
  const sources = images.map((u) => ({ uri: u }));

  return (
    <ImageViewing
      images={sources}
      imageIndex={startIndex}
      visible={visible}
      onRequestClose={onRequestClose}
      // ✅ Footer를 커스텀해서 "1 / N" 표기 + 닫기 버튼
      FooterComponent={({ imageIndex }) => (
        <View style={styles.footer}>
          <View style={styles.footerPill}>
            <Text style={styles.footerText}>{`${imageIndex + 1} / ${images.length}`}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onRequestClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      )}
      // Android 뒤로가기(하드웨어)로 닫히도록
      presentationStyle="fullScreen"
      swipeToCloseEnabled
      doubleTapToZoomEnabled
    />
  );
}
