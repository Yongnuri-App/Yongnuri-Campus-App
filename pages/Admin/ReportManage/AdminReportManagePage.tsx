// pages/Admin/ReportManage/AdminReportManagePage.tsx
import React from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import styles from './AdminReportManagePage.styles';
import type { RootStackScreenProps } from '../../../types/navigation';

import {
  getAdminReportListWithFallback,
  type AdminReportRow,
} from '../../../api/report';

export default function AdminReportManagePage({
  navigation,
}: RootStackScreenProps<'AdminReportManage'>) {
  const [reports, setReports] = React.useState<AdminReportRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const normalizeStatus = (s?: string): 'PENDING' | 'APPROVED' | 'REJECTED' => {
    if (s === 'APPROVED' || s === 'REJECTED') return s;
    return 'PENDING';
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAdminReportListWithFallback();
      // 상태 정규화 + 정렬(PENDING 우선, 그다음 최신순)
      const list = rows.map(r => ({ ...r, status: normalizeStatus(r.status) }));
      const rank = (st: string) => (st === 'PENDING' ? 0 : 1);
      list.sort((a, b) => {
        const ra = rank(String(a.status));
        const rb = rank(String(b.status));
        if (ra !== rb) return ra - rb;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      setReports(list);
    } catch (e) {
      console.log('admin report load error', e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const firstLine = (s?: string) => (s || '').split(/\r?\n/)[0].trim();

  const renderItem = ({ item }: { item: AdminReportRow }) => {
    const nickname = item.reportStudentNickName || '익명';
    const reason = (item.reportReason || '') + (item.content?.trim() ? ` · ${firstLine(item.content)}` : '');

    const status = item.status || 'PENDING';
    const showBadge = status !== 'PENDING';
    const badgeLabel = status === 'APPROVED' ? '인정' : '미인정';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Report', { mode: 'review', reportId: item.id })}
      >
        <View style={styles.rowTextCol}>
          <Text numberOfLines={1} style={styles.nickname}>
            {nickname}
          </Text>
          <Text numberOfLines={2} style={styles.reason}>
            {reason}
          </Text>
        </View>

        {showBadge && (
          <View style={[styles.statusBadge, status === 'APPROVED' ? styles.badgeApproved : styles.badgeRejected]}>
            <Text style={styles.statusBadgeText}>{badgeLabel}</Text>
          </View>
        )}

        <Image
          source={require('../../../assets/images/arrow.png')}
          style={styles.rowArrow}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  };

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>접수된 신고가 없습니다.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 고정 */}
      <View>
        <View style={styles.statusBar} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={require('../../../assets/images/back.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>신고 관리</Text>
          <View style={styles.rightSpacer} />
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={reports}
        keyExtractor={(it, i) => it.id || String(i)}
        renderItem={renderItem}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={
          reports.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      />

      <View style={styles.bottomHandleWrap}>
        <View style={styles.bottomHandle} />
      </View>
    </View>
  );
}
