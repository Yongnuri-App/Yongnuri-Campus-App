import React, { memo } from 'react';
import { Image, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import styles from './ProfileRow.styles';

type Props = {
  name: string;
  dept?: string;
  /** 우측 부가 UI (예: 버튼) */
  right?: React.ReactNode;
  /** 프로필 전체 터치 액션(옵션) */
  onPress?: () => void;
  /** 외부 여백 등(옵션) */
  style?: ViewStyle;
};

function ProfileRow({ name, dept, right, onPress, style }: Props) {
  const Avatar = (
    <Image
      source={require('../../assets/images/profile.png')} // 고정 아바타
      style={styles.avatar}
    />
  );

  const Content = (
    <View style={styles.profileTextCol}>
      <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
      {!!dept && <Text style={styles.profileDept} numberOfLines={1}>{dept}</Text>}
    </View>
  );

  return (
    <View style={[styles.profileRow, style]}>
      {onPress ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={onPress}
        >
          {Avatar}
          {Content}
        </TouchableOpacity>
      ) : (
        <>
          {Avatar}
          {Content}
        </>
      )}
      {!!right && <View style={{ marginLeft: 8 }}>{right}</View>}
    </View>
  );
}

export default memo(ProfileRow);
