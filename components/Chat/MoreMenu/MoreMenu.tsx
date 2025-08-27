// /src/components/Chat/MoreMenu/MoreMenu.tsx
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from './MoreMenu.styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
  onBlock: () => void;
};

/**
 * MoreMenu
 * - 기존 ChatRoomPage.styles.ts의 메뉴 스타일을 1:1 적용
 * - 헤더 우측 "..." 클릭 시 열리는 신고/차단 모달
 */
export default function MoreMenu({ visible, onClose, onReport, onBlock }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <View style={styles.menuBox}>
          <TouchableOpacity style={styles.menuItem} onPress={onReport}>
            <Text style={styles.menuItemText}>신고하기</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={onBlock}>
            <Text style={styles.menuItemText}>차단하기</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
