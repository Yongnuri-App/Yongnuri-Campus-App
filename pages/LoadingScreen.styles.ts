import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width,
    height,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    width,
    height,
    resizeMode: 'cover',
  },
  icon: {
    width: 170,
    height: 170,
    resizeMode: 'contain',
  },
});

export default styles;
