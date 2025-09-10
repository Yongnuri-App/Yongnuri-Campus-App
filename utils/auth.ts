// utils/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'auth_is_admin';

export async function setIsAdmin(v: boolean) {
  await AsyncStorage.setItem(KEY, v ? 'true' : 'false');
}
export async function getIsAdmin() {
  return (await AsyncStorage.getItem(KEY)) === 'true';
}
export async function clearIsAdmin() {
  await AsyncStorage.removeItem(KEY);
}
