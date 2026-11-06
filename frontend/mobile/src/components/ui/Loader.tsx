import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LOGO } from '../../config';
import { colors, fontFor, spacing, type Language } from '../../theme';
import { sineLoop } from '../../utils/animation';

type Props = {
  visible: boolean;
  message: string;
  /** Language of `message`, for picking a font. */
  language: Language;
};

const SIZE = 96;
const RING_WIDTH = 3;
const RING_RADIUS = SIZE / 2 - RING_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const LOGO_SIZE = SIZE - 22;

/** Full-screen overlay: the society logo inside a spinning gold ring. */
export default function Loader({ visible, message, language }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    const pulseLoop = sineLoop(pulse, 700);
    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [visible, spin, pulse]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.ring}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
              ]}
            >
              <Svg width={SIZE} height={SIZE}>
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={RING_RADIUS} stroke={colors.lightGold} strokeWidth={RING_WIDTH} fill="none" />
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RING_RADIUS}
                  stroke={colors.gold}
                  strokeWidth={RING_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE * 0.3} ${CIRCUMFERENCE}`}
                  fill="none"
                />
              </Svg>
            </Animated.View>
            <Animated.Image
              source={LOGO}
              style={{
                width: LOGO_SIZE,
                height: LOGO_SIZE,
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
              }}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.message, { fontFamily: fontFor(language) }]}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backdrop },
  card: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGold,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
