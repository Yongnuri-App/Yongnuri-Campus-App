// pages/Notification/NotificationPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

import AlarmItem from '@/components/ListTile/alarmItem/alarmItem';
import styles from './NotificationPage.styles';
import { getIdentityScope } from '@/utils/localIdentity';
import {
  loadBroadcast,
  loadUserAlarms,
  seenKeyByIdentity,
  type AlarmRow as BaseRow,
  setBroadcast,
} from '@/utils/alarmStorage';
import { fetchAllNotices, type ServerAllNotice } from '@/api/allNotice';
import { fetchNotifications, type ServerNotification } from '@/api/notifications';

type AlarmRowUI = BaseRow & {
  read?: boolean;
  _source?: 'board' | 'personal';
};

/* ───────────────── 유틸 ───────────────── */
const normSpaces = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim();
/** 제목에서 시스템 접두어 제거: [관리자], 새 공지사항: */
const stripTitlePrefixes = (t?: string) =>
  normSpaces(
    (t ?? '')
      .replace(/^\[관리자\]\s*/i, '')
      .replace(/^새\s*공지사항\s*:\s*/i, '')
  );

/** ✅ 신고/경고성 알림 자동 식별
 * - "신고", "경고", "처리 결과", "누적", "5회", "9회" 등 키워드 탐지
 * - 필요한 경우 여기서 키워드 확장 가능
 */
function isReportLike(title?: string, message?: string) {
  const t = normSpaces(title).toLowerCase();
  const m = normSpaces(message).toLowerCase();
  const hay = `${t} ${m}`;
  const keywords = [
    '신고', '처리 결과', '경고', '누적',
    '5회', '5 회', '9회', '9 회',
    '삭제되었습니다', '운영정책', '위반', '탈퇴 처리'
  ];
  return keywords.some(k => hay.includes(k.replace(/\s+/g, ' ')));
}

/** 서버 공지 → AlarmRowUI */
function normBoard(rows: ServerAllNotice[]): AlarmRowUI[] {
  return (rows || []).map((r: any, idx: number) => {
    const id =
      r?.id != null
        ? String(r.id)
        : `${r?.title ?? 'notice'}_${r?.createdAt ?? r?.created_at ?? r?.regDate ?? idx}`;
    const created = r?.createdAt || r?.created_at || r?.regDate || new Date().toISOString();
    const title = normSpaces(String(r?.title ?? ''));
    const content = normSpaces(String(r?.content ?? ''));
    // 공지에는 신고성 거의 없지만 혹시 제목/본문에 키워드가 있으면 표시
    const reportIcon = isReportLike(title, content);

    return {
      id,
      title: title || '(제목 없음)',
      description: content,
      createdAt: new Date(created).toISOString(),
      _source: 'board',
      ...(reportIcon ? { reportIcon: true } : {}),
    };
  });
}

/** 서버 개인 알림 → AlarmRowUI (message/read/신고표시 반영) */
function normPersonal(rows: ServerNotification[]): AlarmRowUI[] {
  return (rows || []).map((r: any, idx: number) => {
    const id =
      r?.id != null
        ? String(r.id)
        : `${r?.title ?? 'alarm'}_${r?.createdAt ?? idx}`;
    const created = r?.createdAt || new Date().toISOString();
    const title = normSpaces(String(r?.title ?? ''));
    const msg = normSpaces(String(r?.message ?? ''));
    const reportIcon = isReportLike(title, msg);

    return {
      id,
      title: title || '(제목 없음)',
      description: msg,
      createdAt: new Date(created).toISOString(),
      ...(typeof r?.read === 'boolean' ? { read: r.read } : {}),
      _source: 'personal',
      ...(reportIcon ? { reportIcon: true } : {}),
    };
  });
}

/** ✅ 중복 제거 병합
 * - 기준: stripTitlePrefixes(title) + description (createdAt 무시)
 * - 우선순위: read(false) 보존, personal 정보 우선, createdAt 은 최신값, reportIcon은 true가 하나라도 있으면 true
 */
function mergeAndDedup(board: AlarmRowUI[], personal: AlarmRowUI[]): AlarmRowUI[] {
  const sig = (x: AlarmRowUI) =>
    `${stripTitlePrefixes(x.title)}|${normSpaces(x.description)}`;

  const map = new Map<string, AlarmRowUI>();

  // 1) board 먼저
  for (const it of board) {
    map.set(sig(it), it);
  }

  // 2) personal 병합
  for (const it of personal) {
    const k = sig(it);
    const prev = map.get(k);

    if (!prev) {
      map.set(k, it);
      continue;
    }

    const latestCreated =
      new Date(it.createdAt).getTime() > new Date(prev.createdAt).getTime()
        ? it.createdAt
        : prev.createdAt;

    const readMerged =
      (prev.read === false || it.read === false) ? false : (it.read ?? prev.read);

    const reportIconMerged = !!(prev.reportIcon || it.reportIcon);

    const base = it._source === 'personal' ? it : prev;

    map.set(k, {
      ...base,
      read: readMerged,
      createdAt: latestCreated,
      reportIcon: reportIconMerged,
      _source: base._source,
    });
  }

  return Array.from(map.values());
}

export default function NotificationPage() {
  const navigation = useNavigation<any>();
  const [alarms, setAlarms] = useState<AlarmRowUI[]>([]);
  const [threshold, setThreshold] = useState<string | null>(null);

  const load = useCallback(async () => {
    // 1) 사용자 식별
    const identity = await getIdentityScope();
    if (!identity) {
      setAlarms([]);
      setThreshold(null);
      return;
    }
    const seenKey = seenKeyByIdentity(identity);

    // 2) 서버 조회
    let boardRows: AlarmRowUI[] = [];
    let personalRows: AlarmRowUI[] = [];
    try {
      const [board, personal] = await Promise.all([
        fetchAllNotices(),
        fetchNotifications(),
      ]);
      boardRows = normBoard(board);
      personalRows = normPersonal(personal);
      // 공지 캐시 교체
      await setBroadcast(boardRows);
    } catch {
      // 폴백은 아래에서
    }

    // 3) 폴백
    if (boardRows.length === 0) boardRows = (await loadBroadcast()) as AlarmRowUI[];
    if (personalRows.length === 0) personalRows = (await loadUserAlarms(identity)) as AlarmRowUI[];

    // 4) 병합 + 중복제거 + 정렬
    const merged = mergeAndDedup(boardRows, personalRows);
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAlarms(merged);

    // 5) 읽음 마커
    const saved = (await AsyncStorage.getItem(seenKey)) || null;
    setThreshold(saved);
    const latest = merged[0]?.createdAt ?? null;
    if (latest && (!saved || new Date(latest) > new Date(saved))) {
      await AsyncStorage.setItem(seenKey, latest);
    } else if (!saved && !latest) {
      await AsyncStorage.setItem(seenKey, new Date().toISOString());
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ✅ 키 중복 방지
  const keyExtractor = useCallback((it: AlarmRowUI, idx: number) => {
    const src = it._source ?? 'mix';
    const id = it.id ? String(it.id) : `noid-${idx}`;
    const ts = it.createdAt ?? '';
    return `${src}:${id}:${ts}`;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AlarmRowUI }) => {
      // read=false면 무조건 New, 아니면 시간 기준
      const t = threshold ? new Date(threshold) : null;
      const isNewByTime = t ? new Date(item.createdAt) > t : true;
      const isNew = (item.read === false) ? true : isNewByTime;

      return (
        <AlarmItem
          title={item.title}
          description={item.description}
          createdAt={item.createdAt}
          highlight={isNew}
          reportIcon={!!item.reportIcon}   // ✅ 신고/경고 알림이면 빨간 아이콘
        />
      );
    },
    [threshold]
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../assets/images/back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
      </View>

      <FlatList
        data={alarms}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#757575' }}>알림이 없어요.</Text>
          </View>
        }
      />
    </View>
  );
}
