import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

/**
 * 키보드 높이를 실시간으로 반환하는 훅
 * - iOS: keyboardWillShow/Hide (애니메이션 타이밍 자연스러움)
 * - Android: keyboardDidShow/Hide
 */
export default function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);

    const subs =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillShow', onShow),
            Keyboard.addListener('keyboardWillHide', onHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', onShow),
            Keyboard.addListener('keyboardDidHide', onHide),
          ];

    return () => subs.forEach(s => s.remove());
  }, []);

  return height;
}
