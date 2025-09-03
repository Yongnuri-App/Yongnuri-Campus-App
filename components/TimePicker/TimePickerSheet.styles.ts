// components/Modal/TimePickerSheet.styles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 16,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  confirmBtn: {
    marginTop: 8,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
