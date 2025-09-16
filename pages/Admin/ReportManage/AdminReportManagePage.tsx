// pages/Admin/ReportManage/AdminReportManagePage.tsx
import React from 'react';
import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import styles from './AdminReportManagePage.styles';
import type { RootStackScreenProps } from '../../../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_KEY = 'reports_v1';

type ReportType = '부적절한 콘텐츠' | '사기/스팸' | '욕설/혐오' | '기타';

type StoredReport = {
  id: string;
  target: {
    email?: string | null;
    nickname?: string;
    dept?: string;
    label?: string;
  };
  type: ReportType;
  content: string;
  images: string[];
  createdAt: string;       // ISO
  reporterEmail?: string | null;
};

export default function AdminReportManagePage({
  navigation,
}: RootStackScreenProps<'AdminReportManage'>) {
  const [reports, setReports] = React.useState<StoredReport[]>([]);

  const load = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(REPORTS_KEY);
      const list: StoredReport[] = raw ? JSON.parse(raw) : [];
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setReports(list);
    } catch (e) {
      console.log('admin report load error', e);
      setReports([]);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const firstLine = (s?: string) => (s || '').split(/\r?\n/)[0].trim();

  const renderItem = ({ item }: { item: StoredReport }) => {
    const nickname =
      item?.target?.nickname ||
      (item?.target?.label ? item.target.label.split(' - ')[0] : '') ||
      (item?.target?.email ? item.target.email.split('@')[0] : '') ||
      '익명';

    const reason =
      item.type +
      (item.content?.trim() ? ` · ${firstLine(item.content)}` : '');

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('Report', { mode: 'review', reportId: item.id })
        }
      >
        <View style={styles.rowTextCol}>
          <Text numberOfLines={1} style={styles.nickname}>
            {nickname}
          </Text>
          <Text numberOfLines={2} style={styles.reason}>
            {reason}
          </Text>
        </View>

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
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={
          reports.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomHandleWrap}>
        <View style={styles.bottomHandle} />
      </View>
    </View>
  );
}
