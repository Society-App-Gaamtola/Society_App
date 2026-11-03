import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';
import { CornerOrnament, GoldDivider, Lotus, TopOrnament } from '../components/Ornaments';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SPLASH_DURATION_MS = 2500;
const LOGO_SIZE = 170;

const fade = (value: Animated.Value, duration: number, delay = 0) =>
  Animated.timing(value, {
    toValue: 1,
    duration,
    delay,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });

/** Fades in and slides up from 16px below. */
const riseStyle = (value: Animated.Value) => ({
  opacity: value,
  transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
});

export default function SplashScreen({ navigation }: Props) {
  const ornaments = useRef(new Animated.Value(0)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const subtitle = useRef(new Animated.Value(0)).current;
  const divider = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const lotus = useRef(new Animated.Value(0)).current;
  const lotusFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      fade(ornaments, 700),
      fade(logo, 800),
      Animated.stagger(180, [
        fade(title, 500, 450),
        fade(subtitle, 500, 450),
        fade(divider, 500, 450),
        fade(tagline, 500, 450),
      ]),
      fade(lotus, 600, 900),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(lotusFloat, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(lotusFloat, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    glowLoop.start();
    floatLoop.start();

    const timer = setTimeout(() => navigation.replace('Onboarding'), SPLASH_DURATION_MS);
    return () => {
      clearTimeout(timer);
      glowLoop.stop();
      floatLoop.stop();
    };
  }, [navigation, ornaments, logo, glow, title, subtitle, divider, tagline, lotus, lotusFloat]);

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: ornaments }]} pointerEvents="none">
        <CornerOrnament position="topLeft" />
        <CornerOrnament position="topRight" />
        <CornerOrnament position="bottomLeft" />
        <CornerOrnament position="bottomRight" />
      </Animated.View>

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.topOrnament, { opacity: ornaments }]}>
          <TopOrnament />
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.logoWrap}>
            <Animated.View
              style={[
                styles.glow,
                {
                  opacity: Animated.multiply(logo, glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] })),
                  transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
                },
              ]}
            />
            <Animated.Image
              source={require('../../assets/logo.png')}
              style={[
                styles.logo,
                {
                  opacity: logo,
                  transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                },
              ]}
              resizeMode="contain"
            />
          </View>

          <Animated.Text style={[styles.title, riseStyle(title)]}>{'શ્રી ગામટોળા\nયુવક મિત્ર મંડળ'}</Animated.Text>
          <Animated.Text style={[styles.subtitle, riseStyle(subtitle)]}>Society Cultural Activity App</Animated.Text>
          <Animated.View style={[styles.divider, riseStyle(divider)]}>
            <GoldDivider />
          </Animated.View>
          <Animated.Text style={[styles.tagline, riseStyle(tagline)]}>|| સંસ્કાર • સંગઠન • સમાજ માટે ||</Animated.Text>
        </View>

        <Animated.View
          style={[
            styles.lotus,
            {
              opacity: lotus,
              transform: [{ translateY: lotusFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
            },
          ]}
        >
          <Lotus />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, alignItems: 'center' },
  topOrnament: { marginTop: spacing.sm },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  glow: {
    position: 'absolute',
    width: LOGO_SIZE + 36,
    height: LOGO_SIZE + 36,
    borderRadius: (LOGO_SIZE + 36) / 2,
    backgroundColor: colors.lightGold,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  title: {
    fontFamily: fonts.gujaratiHeading,
    fontSize: 32,
    lineHeight: 48,
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textDark,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  divider: { marginVertical: spacing.md },
  tagline: {
    fontFamily: fonts.gujaratiRegular,
    fontSize: 14,
    lineHeight: 24,
    color: colors.primary,
    textAlign: 'center',
  },
  lotus: { marginBottom: spacing.lg },
});
