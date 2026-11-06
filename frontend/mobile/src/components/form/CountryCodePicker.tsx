import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '../../icons';
import { colors, fonts, radius, spacing } from '../../theme';

export type Country = { code: string; dial: string; flag: string; name: string };

export const COUNTRIES: Country[] = [
  { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' },
];

type Props = {
  value: Country;
  onChange: (country: Country) => void;
  style?: StyleProp<ViewStyle>;
};

export default function CountryCodePicker({ value, onChange, style }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Country code ${value.dial}`}
        style={[styles.box, style]}
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dial}>{value.dial}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedIcon} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.code === value.code && styles.optionActive]}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.optionName}>{item.name}</Text>
                  <Text style={styles.dial}>{item.dial}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 90,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  flag: { fontSize: 18 },
  dial: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    maxHeight: 360,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  optionActive: { backgroundColor: colors.background },
  optionName: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textDark },
});
