import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styles from './BottomTabBar.styles';

export type TabKey = 'market' | 'lost' | 'chat' | 'group' | 'notice';

type Props = {
  value: TabKey;                      // 현재 선택된 탭
  onChange: (next: TabKey) => void;   // 탭 변경 콜백
};

const TABS: Array<{
  key: TabKey;
  label: string;
  // 아이콘
  iconInactive: any;
  iconActive: any;
}> = [
  {
    key: 'market',
    label: '중고거래',
    iconInactive: require('../../assets/images/Bottom/bag1.png'),
    iconActive: require('../../assets/images/Bottom/bag2.png'),
  },
  {
    key: 'lost',
    label: '분실물',
    iconInactive: require('../../assets/images/Bottom/inventory1.png'),
    iconActive: require('../../assets/images/Bottom/inventory2.png'),
  },
  {
    key: 'chat',
    label: '채팅',
    iconInactive: require('../../assets/images/Bottom/chat1.png'),
    iconActive: require('../../assets/images/Bottom/chat2.png'),
  },
  {
    key: 'group',
    label: '공동구매',
    iconInactive: require('../../assets/images/Bottom/people1.png'),
    iconActive: require('../../assets/images/Bottom/people2.png'),
  },
  {
    key: 'notice',
    label: '공지사항',
    iconInactive: require('../../assets/images/Bottom/board1.png'),
    iconActive: require('../../assets/images/Bottom/board2.png'),
  },
];

export default function BottomNav({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = value === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} 탭`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={active ? tab.iconActive : tab.iconInactive}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
