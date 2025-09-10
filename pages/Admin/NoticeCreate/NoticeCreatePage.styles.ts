import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  /* 헤더 */
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { width: 20, height: 20, resizeMode: 'contain' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1E1E1E' },

  /* 콘텐츠 */
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1E1E',
  },

  input: {
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E1E1E',
    backgroundColor: '#fff',
  },
  textarea: { height: 200 },

  dateBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 13, color: '#979797' },
  chevronIcon: { width: 20, height: 20, tintColor: '#979797', resizeMode: 'contain' },

  submitBtn: {
    marginTop: 28,
    height: 50,
    borderRadius: 50,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#A0AEC0' },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  /* ===== 커스텀 날짜 다이얼 ===== */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 16 + (Platform.OS === 'ios' ? 12 : 8),
    paddingHorizontal: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#1E1E1E', textAlign: 'center' },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  // ✅ 연도 칼럼 더 넓게
  pickerColYear: { flex: 1.6, marginHorizontal: 4 },
  // 월/일 기본 폭
  pickerCol: { flex: 1, marginHorizontal: 1 },

  pickerLabel: { textAlign: 'center', color: '#979797', marginBottom: 6 },

  picker: {
    height: 180,
    width: '100%',
  },

  // ✅ iOS 휠 아이템 스타일(안드로이드는 무시됨)
  pickerItemIOS: {
    fontSize: 18,
    color: '#1E1E1E',
  },

  sheetConfirmBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
