// pages/Admin/AdminPage/AllNotice/AllNoticeCreatePage.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  /* 헤더 (좌:뒤로, 중앙:제목) */
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { width: 20, height: 20, resizeMode: 'contain' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1E1E1E',
  },

  /* 본문 */
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1E1E',
  },

  input: {
    height: 47,
    borderWidth: 1,
    borderColor: '#979797',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1E1E1E',
    backgroundColor: '#fff',
  },

  textarea: {
    height: 200,
    paddingTop: 12,
  },

  /* 하단 버튼 래퍼 */
  submitWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  submitBtn: {
    height: 50,
    borderRadius: 50,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#A0AEC0',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
