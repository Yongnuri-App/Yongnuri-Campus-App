import React from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from './MoreMenu.styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
  onBlock: () => void;
};

/** ✅ 아이콘 리소스
 * - 경로는 src/assets/images 기준. 프로젝트 구조에 따라 조정 필요.
 */
const ALERT_ICON = require('../../../assets/images/alert_red.png');
const BLOCK_ICON = require('../../../assets/images/block.png');

/**
 * MoreMenu
 * - 신고/차단 항목 좌측에 아이콘 추가
 * - 기존 ChatRoomPage.styles.ts의 메뉴 스타일을 1:1 적용
 * - 헤더 우측 "..." 클릭 시 열리는 신고/차단 모달
 */
export default function MoreMenu({ visible, onClose, onReport, onBlock }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 배경 터치 시 닫힘 */}
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        {/* 메뉴 박스 영역(눌러도 닫히지 않도록 내부는 TouchableOpacity로 처리) */}
        <View style={styles.menuBox}>
          {/* 신고하기 */}
          <TouchableOpacity style={styles.menuItem} onPress={onReport} activeOpacity={0.85}>
            <View style={styles.menuItemRow}>
              <Image source={ALERT_ICON} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>신고하기</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 차단하기 */}
          <TouchableOpacity style={styles.menuItem} onPress={onBlock} activeOpacity={0.85}>
            <View style={styles.menuItemRow}>
              <Image source={BLOCK_ICON} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>차단하기</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
