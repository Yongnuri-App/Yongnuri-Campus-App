// /components/Chat/MoreMenu.tsx
import React, { useCallback } from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import styles from './MoreMenu.styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onReport: () => void; // 부모에서 신고 네비게이션/로직 처리
  onBlock: () => void;  // 부모에서 차단 로직 처리
};

const ALERT_ICON = require('../../../assets/images/alert_red.png');
const BLOCK_ICON = require('../../../assets/images/block.png');

export default function MoreMenu({ visible, onClose, onReport, onBlock }: Props) {
  // 신고 버튼: 모달 닫고, 부모 핸들러 호출
  const handlePressReport = useCallback(() => {
    onClose?.();
    onReport?.();
  }, [onClose, onReport]);

  // 차단 버튼: 모달 닫고, 부모 핸들러 호출(필요시 유지)
  const handlePressBlock = useCallback(() => {
    onClose?.();
    onBlock?.();
  }, [onClose, onBlock]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 바깥 영역 클릭 시 닫힘 */}
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        {/* 메뉴 박스 (내부 터치 시 닫히지 않도록 View로 감싸고, 각 항목은 TouchableOpacity) */}
        <View style={styles.menuBox}>
          {/* 신고하기 */}
          <TouchableOpacity style={styles.menuItem} onPress={handlePressReport} activeOpacity={0.85}>
            <View style={styles.menuItemRow}>
              <Image source={ALERT_ICON} style={styles.menuIcon} />
              <Text style={styles.menuItemText}>신고하기</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 차단하기 */}
          <TouchableOpacity style={styles.menuItem} onPress={handlePressBlock} activeOpacity={0.85}>
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
