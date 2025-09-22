// components/ListTile/alarmItem/alarmItem.tsx
import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import styles from './alarmItem.styles';

export type AlarmItemProps = {
  title: string;               // 예: "[관리자] 거래가 정상적으로 완료되었습니다!"
  description?: string;        // 줄바꿈 없이 저장된 본문
  createdAt?: string | Date;   // ISO 문자열 또는 Date
  onPress?: () => void;        // 탭 액션(선택)
};

function fmtKR(datetime?: string | Date) {
  if (!datetime) return '';
  const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${hh}:${mm}, ${month}월 ${day}일`;
}

function AlarmItem({ title, description, createdAt, onPress }: AlarmItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
    >
      {/* 제목 */}
      <Text style={styles.title}>{title}</Text>

      {/* 본문: 오른쪽 끝까지 꽉 차게 */}
      {!!description && <Text style={styles.desc}>{description}</Text>}

      {/* 시간: 항상 내용의 아랫줄, 오른쪽 정렬 */}
      <View style={styles.timeRow}>
        <Text style={styles.time}>{fmtKR(createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default memo(AlarmItem);
