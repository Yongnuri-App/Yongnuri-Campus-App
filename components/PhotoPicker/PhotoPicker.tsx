import React, { memo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styles from './PhotoPicker.styles';

type Props = {
  /** 선택된 이미지 URI 목록 (부모가 상태 보유) */
  images: string[];
  /** 최대 허용 개수 (기본 10) */
  max?: number;
  /** "카메라/갤러리 열기" 같은 동작을 부모로 위임 */
  onAddPress: () => void;
  /** 썸네일 x 버튼으로 삭제를 허용하려면 전달 (선택) */
  onRemoveAt?: (index: number) => void;
};

/**
 * 사진 선택 UI (가로 스크롤 한 줄)
 * [ + ] 버튼과 썸네일이 같은 가로 라인에서 좌→우로 늘어납니다.
 * - 실제 ImagePicker는 부모에서 onAddPress로 제어
 * - 이미지 개수 제한(표시)은 여기서 처리, 실제 제한 로직은 부모에서도 한 번 더 점검 권장
 */
const PhotoPicker: React.FC<Props> = ({
  images,
  max = 10,
  onAddPress,
  onRemoveAt,
}) => {
  return (
    <View style={styles.container}>
      {/* 가로 스크롤 한 줄 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* 사진 추가 타일 (가장 왼쪽 고정) */}
        <TouchableOpacity
          style={styles.addTile}
          activeOpacity={0.8}
          onPress={onAddPress}
        >
          <Image
            // 프로젝트 구조에 맞게 경로 유지 (필요시 수정)
            source={require('../../assets/images/camera.png')}
            style={styles.cameraIcon}
          />
          <Text style={styles.countText}>
            {images.length}/{max}
          </Text>
        </TouchableOpacity>

        {/* 선택된 썸네일들 */}
        {images.map((uri, idx) => (
          <View key={`${uri}-${idx}`} style={styles.thumbWrap}>
            <Image source={{ uri }} style={styles.thumb} />
            {!!onRemoveAt && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemoveAt(idx)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeX}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default memo(PhotoPicker);
