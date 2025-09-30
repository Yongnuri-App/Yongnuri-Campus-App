import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
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

/**
 * AdminActionSheet
 * - 투명 모달 위에 카드 메뉴를 띄우는 액션시트
 * - 배경 클릭 시 닫히고, 메뉴 간 얇은 구분선을 표시
 */
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* ✅ 딤(반투명) 배경: 누르면 닫힘 */}
      <TouchableOpacity
        style={styles.dim}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="닫기"
      />

      {/* 액션 카드 */}
      <View style={styles.card}>

        {/* 수정 버튼 (옵션) */}
        {showEdit && (
          <TouchableOpacity
            style={styles.item}
            activeOpacity={0.8}
            onPress={() => {
              onClose?.();      // 시트 닫고
              onEdit?.();       // 수정 동작
            }}
            accessibilityRole="button"
            accessibilityLabel={editLabel}
          >
            <Text style={styles.itemText}>{editLabel}</Text>
          </TouchableOpacity>
        )}

        {/* ✅ 구분선: showEdit=true일 때만 노출 */}
        {showEdit && <View style={styles.divider} />}

        {/* 삭제 버튼 */}
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.8}
          onPress={() => {
            onClose?.();        // 시트 닫고
            onDelete();         // 삭제 동작
          }}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
        >
          <Text style={styles.itemTextDanger}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
