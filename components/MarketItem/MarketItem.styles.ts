import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    // shadow 대신 RN용 그림자
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 12,
  },
  thumbnail: {
    width: 121,
    height: 121,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    width: 216,        // Figma 기준
    height: 20,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 20,    // identical to box height
    color: '#212124',
    marginBottom: 3,   // subtitle과 간격 조절
  },
  subtitle: {
    width: 114,
    height: 15,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 15,
    color: '#979797',
    marginBottom: 5,   // price와 간격 조절
  },
  price: {
    width: 152,
    height: 20,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
    color: '#000000',
  },
  likeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 80,
  },
  likeIcon: {
    width: 14,
    height: 14,
    tintColor: '#BBBBBB',
    marginRight: 4,
  },
  likeCount: {
    fontSize: 11,
    fontWeight: '500',
    color: '#BBBBBB',
  },
});
