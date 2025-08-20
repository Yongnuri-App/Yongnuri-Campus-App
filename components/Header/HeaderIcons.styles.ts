// components/Header/HeaderIcons.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    marginLeft: 16,
  },
  badge: {
    position: 'absolute',
    right: -3,
    top: -4,
    backgroundColor: '#E53935',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});
