import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './NotificationPage.styles';

/**
 * 샘플 알림 데이터
 * - 추후 서버 API 연동 시, createdAt, read 여부, 링크 이동 정보 등을 포함하면 좋아요.
 */
const SAMPLE_NOTICES = [
  { id: 'n1', title: '새로운 채팅이 도착했어요', time: '방금 전', unread: true },
  { id: 'n2', title: '관심 상품에 가격 변동이 있어요', time: '1시간 전', unread: true },
  { id: 'n3', title: '운영 공지: 점검 안내 (8/25 02:00)', time: '어제', unread: false },
  { id: 'n4', title: '거래 약속이 곧 시작돼요 (오후 3:00)', time: '어제', unread: false },
];

export default function NotificationPage() {
  const navigation = useNavigation();
  // 실제로는 서버에서 페이징/무한스크롤 + 읽음 상태 업데이트를 하게 될 것
  const notices = useMemo(() => SAMPLE_NOTICES, []);

  const renderItem = ({ item }: { item: typeof SAMPLE_NOTICES[number] }) => (
    <TouchableOpacity style={styles.itemContainer} activeOpacity={0.7}>
      {/* 왼쪽: 상태 점(미읽음 표시 대체) */}
      <View style={[styles.dot, item.unread ? styles.dotUnread : styles.dotRead]} />

      {/* 가운데: 제목/시간 */}
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Image
            source={require('../../assets/images/time.png')}
            style={styles.metaIcon}
          />
          <Text style={styles.itemTime}>{item.time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 뒤로가기 + 제목 */}
      <View style={styles.header}>
        {/* 왼쪽: 뒤로가기 버튼 */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image
            source={require('../../assets/images/back.png')}
            style={styles.backIcon}
            resizeMode="contain"
            />
        </TouchableOpacity>

        {/* 가운데: 타이틀 (절대 위치로 화면 기준 중앙) */}
        <Text style={styles.headerTitle}>알림</Text>
        </View>

      {/* 알람 리스트 */}
      <FlatList
        data={notices}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}
