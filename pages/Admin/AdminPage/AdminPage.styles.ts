import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -40,
  },
  statusBar: {
    height: 44, // 피그마 기준
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  headerRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    marginLeft: 16,
  },
  headerIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  greetingWrap: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  greetingTextCol: {},
  greeting: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 6,
  },
  subDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#979797',
  },

  dividerTop: {
    height: 1,
    backgroundColor: '#979797',
    opacity: 0.6,
    marginVertical: 16,
  },
  dividerMid: {
    height: 1,
    backgroundColor: '#979797',
    opacity: 0.6,
    marginVertical: 16,
  },

  sectionCaption: {
    fontSize: 13,
    fontWeight: '500',
    color: '#979797',
    marginBottom: 8,
  },

  row: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1E',
  },
  rowArrow: {
    width: 18,
    height: 18,
    marginLeft: 'auto',
    resizeMode: 'contain',
    opacity: 0.55,
  },
});
