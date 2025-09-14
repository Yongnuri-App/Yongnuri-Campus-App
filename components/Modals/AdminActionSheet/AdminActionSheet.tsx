// components/Modals/AdminActionSheet/AdminActionSheet.tsx
import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import styles from './AdminActionSheet.styles';

type Props = {
  visible: boolean;
  onClose: () => void;

  /** 공지 등: 수정+삭제 / 그 외: 삭제만 */
  showEdit?: boolean;
  editLabel?: string;
  deleteLabel?: string;

  onEdit?: () => void;
  onDelete: () => void;
};

export default function AdminActionSheet({
  visible,
  onClose,
  showEdit = false,
  editLabel = '수정',
  deleteLabel = '삭제',
  onEdit,
  onDelete,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dim} activeOpacity={1} onPress={onClose} />
      <View style={styles.card}>
        {showEdit && (
          <TouchableOpacity style={styles.item} activeOpacity={0.8} onPress={onEdit}>
            <Text style={styles.itemText}>{editLabel}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.item} activeOpacity={0.8} onPress={onDelete}>
          <Text style={styles.itemTextDanger}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
