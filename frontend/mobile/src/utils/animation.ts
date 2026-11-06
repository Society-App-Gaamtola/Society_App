import { Animated, Easing } from 'react-native';

/** Endless sine-eased 0 → 1 → 0 loop on the native thread. `duration` is one direction. */
export const sineLoop = (value: Animated.Value, duration: number) => {
  const to = (toValue: number) =>
    Animated.timing(value, { toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
  return Animated.loop(Animated.sequence([to(1), to(0)]));
};
