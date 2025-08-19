import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    position: 'relative',  
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 65,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: 45,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  itemContainer: {
    minHeight: 70,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  dotUnread: {
    backgroundColor: '#395884', // 프로젝트 톤과 어울리는 진한 파랑
  },
  dotRead: {
    backgroundColor: '#B0C8EE', // 읽음은 연한 톤
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E1E1E',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    tintColor: '#979797',
  },
  itemTime: {
    fontSize: 12,
    color: '#979797',
  },
  separator: {
    height: 1,
    backgroundColor: '#EDEDED',
  },
});
