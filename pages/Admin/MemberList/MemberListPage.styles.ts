import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* 헤더 */
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E1E1E',
  },

  /* 검색 */
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 8,
    height: 39,
    position: 'relative',
  },
  searchInput: {
    height: 39,
    borderRadius: 8,
    backgroundColor: '#EDEDED',
    paddingHorizontal: 12,
    paddingRight: 40, // 아이콘 자리
    fontSize: 14,
    color: '#1E1E1E',
  },
  searchIcon: {
    position: 'absolute',
    right: 8,
    top: 7,
    width: 25,
    height: 25,
  },

  listContainer: {
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#EFEFEF',
  },

  /* 아이템 행: 이름 | 학번 | 학과 | 닉네임 | 신고 횟수 */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  // 각 컬럼은 실제 폭은 .tsx에서 지정, 여기선 타이포만 관리
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1E1E',
  },
  studentId: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  department: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  nickname: {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  report: {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: '500',
    color: '#1E1E1E',
  },
});
