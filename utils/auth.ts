import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'auth_is_admin';

export async function setIsAdmin(v: boolean) {
  await AsyncStorage.setItem(KEY, v ? 'true' : 'false');
}

export async function getIsAdmin(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'true' || v === '1';
}

export async function clearIsAdmin() {
  await AsyncStorage.removeItem(KEY);
}
