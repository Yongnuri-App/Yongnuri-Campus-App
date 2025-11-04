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
  mergeSortAlarms,
  seenKeyByIdentity,
  type AlarmRow as BaseRow,
  setBroadcast,
  uniqId,
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
    return {
      id,
      title: title || '(제목 없음)',
      description: content,
      createdAt: new Date(created).toISOString(),
      _source: 'board',
    };
  });
}

/** 서버 개인 알림 → AlarmRowUI (message/read 반영) */
function normPersonal(rows: ServerNotification[]): AlarmRowUI[] {
  return (rows || []).map((r: any, idx: number) => {
    const id =
      r?.id != null
        ? String(r.id)
        : `${r?.title ?? 'alarm'}_${r?.createdAt ?? idx}`;
    const created = r?.createdAt || new Date().toISOString();
    const title = normSpaces(String(r?.title ?? ''));
    const msg = normSpaces(String(r?.message ?? ''));
    return {
      id,
      title: title || '(제목 없음)',
      description: msg,
      createdAt: new Date(created).toISOString(),
      ...(typeof r?.read === 'boolean' ? { read: r.read } : {}),
      _source: 'personal',
    };
  });
}

/** ✅ 중복 제거 병합
 * - 기준: stripTitlePrefixes(title) + description (createdAt 무시)
 * - 우선순위: read(false) 보존, personal 정보 우선, createdAt 은 최신값으로
 */
function mergeAndDedup(board: AlarmRowUI[], personal: AlarmRowUI[]): AlarmRowUI[] {
  const sig = (x: AlarmRowUI) =>
    `${stripTitlePrefixes(x.title)}|${normSpaces(x.description)}`;

  const map = new Map<string, AlarmRowUI>();

  // 1) board 먼저 넣기
  for (const it of board) {
    map.set(sig(it), it);
  }

  // 2) personal로 병합(덮어쓰기 규칙)
  for (const it of personal) {
    const k = sig(it);
    const prev = map.get(k);

    if (!prev) {
      map.set(k, it);
      continue;
    }

    // createdAt 최신값 선택
    const latestCreated =
      new Date(it.createdAt).getTime() > new Date(prev.createdAt).getTime()
        ? it.createdAt
        : prev.createdAt;

    // read 우선순위: 하나라도 false면 false
    const readMerged =
      (prev.read === false || it.read === false) ? false : (it.read ?? prev.read);

    // personal 정보를 우선 보존(설명/제목 등), 다만 제목/본문은 동일 시그니처라 큰 차이 없음
    const base = it._source === 'personal' ? it : prev;

    map.set(k, {
      ...base,
      read: readMerged,
      createdAt: latestCreated,
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

    // 2) 서버에서 공지 + 개인 알림 조회
    let boardRows: AlarmRowUI[] = [];
    let personalRows: AlarmRowUI[] = [];
    try {
      const [board, personal] = await Promise.all([
        fetchAllNotices(),
        fetchNotifications(),
      ]);
      boardRows = normBoard(board);
      personalRows = normPersonal(personal);

      // 공지 캐시 교체 저장(오프라인 대비)
      await setBroadcast(boardRows);
    } catch {
      // 서버 실패 시 캐시 폴백
    }

    // 3) 폴백
    if (boardRows.length === 0) boardRows = (await loadBroadcast()) as AlarmRowUI[];
    if (personalRows.length === 0) personalRows = (await loadUserAlarms(identity)) as AlarmRowUI[];

    // 4) 병합 + 중복제거 + 정렬(최신 우선)
    const merged = mergeAndDedup(boardRows, personalRows);
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAlarms(merged);

    // 5) 읽음 마커 갱신
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

  // ✅ 키 중복 방지: 소스/아이디/타임스탬프 합성
  const keyExtractor = useCallback((it: AlarmRowUI, idx: number) => {
    const src = it._source ?? 'mix';
    const id = it.id ? String(it.id) : `noid-${idx}`;
    const ts = it.createdAt ?? '';
    return `${src}:${id}:${ts}`;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AlarmRowUI }) => {
      // 서버 read=false면 무조건 new 취급, 아니면 시간 기준
      const t = threshold ? new Date(threshold) : null;
      const isNewByTime = t ? new Date(item.createdAt) > t : true;
      const isNew = (item.read === false) ? true : isNewByTime;

      return (
        <AlarmItem
          title={item.title}
          description={item.description}
          createdAt={item.createdAt}
          highlight={isNew}
          reportIcon={false}
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
