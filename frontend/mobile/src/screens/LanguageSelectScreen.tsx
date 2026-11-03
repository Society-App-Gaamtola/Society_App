import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fontFor, fonts, radius, spacing, type Language } from '../theme';
import { languages, t } from '../i18n/strings';
import { setAppLanguage } from '../i18n';
import { Lotus } from '../components/Ornaments';
import Loader from '../components/Loader';

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageSelect'>;

const BADGE_INACTIVE = '#EFEAE4';
const MIN_LOADER_MS = 800;

export default function LanguageSelectScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Language>('gu');
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    setSaving(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADER_MS));
    try {
      await setAppLanguage(selected);
    } catch {
      // Language is still applied in memory; persisting will be retried next time.
    }
    await minDelay;
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandTitle}>{'શ્રી ગામટોળા\nયુવક મિત્ર મંડળ'}</Text>
        </View>

        <Text style={styles.heading}>{t('selectLanguage', 'en')}</Text>
        <Text style={styles.subtext}>{t('selectLanguageHint', 'en')}</Text>

        <View style={styles.list}>
          {languages.map(({ code, native, badge }) => {
            const active = code === selected;
            return (
              <Pressable
                key={code}
                onPress={() => setSelected(code)}
                style={[styles.card, active && styles.cardActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.badge, active && styles.badgeActive]}>
                  <Text
                    style={[
                      styles.badgeText,
                      { fontFamily: fontFor(code, 'bold') },
                      active && styles.badgeTextActive,
                    ]}
                  >
                    {badge}
                  </Text>
                </View>
                <Text style={[styles.label, { fontFamily: fontFor(code, code === 'en' ? 'bold' : 'regular') }]}>
                  {native}
                </Text>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, (pressed || saving) && styles.buttonPressed]}
          onPress={onContinue}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{t('continue', 'en')} →</Text>
        </Pressable>

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{t('changeLanguageInfo', 'en')}</Text>
        </View>

        <View style={styles.lotus}>
          <Lotus />
        </View>
      </ScrollView>
      <Loader overlay visible={saving} message={t('loading', selected)} language={selected} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg },
  brand: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 110, height: 110, marginBottom: spacing.sm },
  brandTitle: {
    fontFamily: fonts.gujaratiHeading,
    fontSize: 24,
    lineHeight: 36,
    color: colors.primary,
    textAlign: 'center',
  },
  heading: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 28, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  list: { gap: 12, marginTop: spacing.md, marginBottom: spacing.lg },
  card: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  cardActive: { borderWidth: 1.5, borderColor: colors.primary },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: BADGE_INACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: colors.primary },
  badgeText: { fontSize: 14, color: colors.textDark },
  badgeTextActive: { color: colors.white },
  label: { flex: 1, fontSize: 16, color: colors.textDark, marginLeft: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  button: {
    height: 52,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.white },
  info: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  lotus: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: spacing.lg },
});
