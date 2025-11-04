import React, { memo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './alarmItem.styles';

export type AlarmItemProps = {
  title: string;               // "[관리자] ..." 그대로 표시
  description?: string;        // 줄바꿈 제거된 본문
  createdAt?: string | Date;   // ISO or Date
  onPress?: () => void;
  highlight?: boolean;
  /** ✅ 신고 알림일 때만 아이콘 노출 */
  reportIcon?: boolean;
  /** (선택) 테스트/자동화용 */
  testID?: string;
};

/** 안전한 날짜 포맷터 (유효하지 않으면 빈 문자열) */
function fmtKR(datetime?: string | Date) {
  if (!datetime) return '';
  const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
  const t = d instanceof Date && !isNaN(d.getTime()) ? d : null;
  if (!t) return '';

  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const month = t.getMonth() + 1;
  const day = t.getDate();
  return `${hh}:${mm}, ${month}월 ${day}일`;
}

function AlarmItem({
  title,
  description,
  createdAt,
  onPress,
  highlight,
  reportIcon,
  testID,
}: AlarmItemProps) {
  const timeText = fmtKR(createdAt);

  return (
    <TouchableOpacity
      style={[styles.container, highlight && styles.containerHighlight]}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`알림: ${title}${timeText ? `, ${timeText}` : ''}`}
      disabled={!onPress}
      testID={testID}
    >
      {/* 제목 행: (신고 알림이면 아이콘) + 제목 */}
      <View style={styles.titleRow}>
        {reportIcon && (
          <Image
            source={require('../../../assets/images/alert_red.png')}
            style={styles.adminIcon}
            resizeMode="contain"
          />
        )}
        <Text
          style={[styles.title, highlight && styles.titleHighlight]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>

      {!!description && (
        <Text
          style={[styles.desc, highlight && styles.descHighlight]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {description}
        </Text>
      )}


      <View style={styles.timeRow}>
        {!!timeText && (
          <Text style={[styles.time, highlight && styles.timeHighlight]}>{timeText}</Text>
        )}
      </View>

      {/* 양쪽 끝까지 가는 상/하 경계선 */}
      <View style={styles.topLine} />
      <View style={styles.bottomLine} />
    </TouchableOpacity>
  );
}

export default memo(AlarmItem);
