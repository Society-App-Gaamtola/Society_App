import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontFor, spacing, type Language } from '../theme';
import i18n from '../i18n';

type Props = {
  /** Show the loader. Defaults to true so it can be rendered as a whole screen. */
  visible?: boolean;
  /** Optional text under the spinner. */
  message?: string;
  /** Overlay on top of the current screen instead of filling the screen. */
  overlay?: boolean;
  size?: number;
  /** Language of `message`, for picking a font; defaults to the app language. */
  language?: Language;
};

const RING_WIDTH = 3;

/** Society logo inside a spinning gold ring. */
export default function Loader({ visible = true, message, overlay = false, size = 96, language }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [visible, spin, pulse]);

  if (!visible) return null;

  const r = size / 2 - RING_WIDTH;
  const circumference = 2 * Math.PI * r;
  const logoSize = size - 22;

  const content = (
    <View style={[styles.container, overlay ? styles.overlay : styles.fullScreen]}>
      <View style={[styles.card, overlay && styles.cardElevated]}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
            ]}
          >
            <Svg width={size} height={size}>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.lightGold} strokeWidth={RING_WIDTH} fill="none" />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={colors.gold}
                strokeWidth={RING_WIDTH}
                strokeLinecap="round"
                strokeDasharray={`${circumference * 0.3} ${circumference}`}
                fill="none"
              />
            </Svg>
          </Animated.View>
          <Animated.Image
            source={require('../../assets/logo.png')}
            style={{
              width: logoSize,
              height: logoSize,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            }}
            resizeMode="contain"
          />
        </View>
        {message ? (
          <Text style={[styles.message, { fontFamily: fontFor(language ?? (i18n.language as Language)) }]}>{message}</Text>
        ) : null}
      </View>
    </View>
  );

  if (!overlay) return content;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullScreen: { backgroundColor: colors.background },
  overlay: { backgroundColor: 'rgba(43, 26, 18, 0.35)' },
  card: { alignItems: 'center', padding: spacing.lg, borderRadius: 16 },
  cardElevated: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.lightGold,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
