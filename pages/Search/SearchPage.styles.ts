// pages/Search/SearchPage.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 39,
    marginBottom: 20,
  },
  iconBack: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: '#323232',
  },
  input: {
    flex: 1,
    height: 39,
    backgroundColor: '#EDEDED',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#1E1E1E',
  },
  iconSearch: {
    width: 25,
    height: 25,
    marginLeft: 10,
    tintColor: '#1E1E1E',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  deleteAll: {
    fontSize: 15,
    fontWeight: '500',
    color: '#979797',
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#FFFFFF',
  },
  keywordText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1E1E1E',
  },
  iconTime: {
    width: 16,
    height: 16,
    tintColor: '#979797',
  },
  iconDelete: {
    width: 15,
    height: 15,
    tintColor: '#979797',
  },
});
