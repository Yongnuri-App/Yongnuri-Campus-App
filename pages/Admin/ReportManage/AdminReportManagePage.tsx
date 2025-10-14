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

type Row = AdminReportRow & { _localId: string };

/** 서버 enum → 한글 라벨 */
function reasonToKo(s?: string | null): string {
  switch ((s || '').toUpperCase()) {
    case 'OBSCENE_CONTENT':
      return '부적절한 콘텐츠';
    case 'SPAM':
      return '사기/스팸';
    case 'DEFAMATION_HATE':
      return '욕설/혐오';
    case 'PROMOTION_ADVERTISING':
      return '홍보/광고';
    case 'IMPERSONATION_FAKE_INFO':
      return '사칭/허위정보';
    case 'ETC':
      return '기타';
    default:
      return s || '기타';
  }
}

export default function AdminReportManagePage({
  navigation,
}: RootStackScreenProps<'AdminReportManage'>) {
  const [reports, setReports] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  // ⬇︎ 여기 타입에 null 포함
  const normalizeStatus = (
    s: string | null | undefined,
  ): 'PENDING' | 'APPROVED' | 'REJECTED' => {
    if (s === 'APPROVED' || s === 'REJECTED') return s;
    return 'PENDING';
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAdminReportListWithFallback();

      const withLocalId: Row[] = rows.map((r, i) => ({
        ...r,
        _localId: `r_${(r as any)?.id ?? r.typeId ?? ''}_${i}`,
        status: normalizeStatus(r.status), // ✅ 이제 오류 안 남
      }));

      const rank = (st: string) => (st === 'PENDING' ? 0 : 1);
      withLocalId.sort((a, b) => rank(String(a.status)) - rank(String(b.status)));

      setReports(withLocalId);
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

  const renderItem = ({ item }: { item: Row }) => {
    const nickname = item.reportStudentNickName || '익명';
    const reasonKo = reasonToKo(item.reportReason || '');
    const reason =
      reasonKo + (item.content?.trim() ? ` · ${firstLine(item.content)}` : '');

    const status = item.status || 'PENDING';
    const showBadge = status !== 'PENDING';
    const badgeLabel = status === 'APPROVED' ? '인정' : '미인정';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('Report', { mode: 'review', reportId: item._localId })
        }
      >
        <View style={styles.rowTextCol}>
          <Text numberOfLines={1} style={styles.nickname}>{nickname}</Text>
          <Text numberOfLines={2} style={styles.reason}>{reason}</Text>
        </View>

        {showBadge && (
          <View
            style={[
              styles.statusBadge,
              status === 'APPROVED' ? styles.badgeApproved : styles.badgeRejected,
            ]}
          >
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
      {/* 헤더(디자인 유지) */}
      <View>
        <View style={styles.statusBar} />
        {/* 불필요한 className View 제거 */}
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
        keyExtractor={(item) => item._localId}
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