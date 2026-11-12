import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as authApi from '../api/auth';
import { common, surface } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import { showToast } from '../utils/toast';
import { MIN_PASSWORD_LENGTH } from '../utils/validation';
import { AppHeader, FormField, IconCircle, InputField, KeyboardAvoid, PrimaryButton } from '../components';

type Field = 'current' | 'next' | 'confirm';

const API_FIELDS: Record<string, Field> = { old_password: 'current', new_password: 'next', confirm_password: 'confirm' };

const STRENGTH = [
  { label: 'Too short', color: colors.danger },
  { label: 'Weak', color: colors.danger },
  { label: 'Fair', color: colors.warning },
  { label: 'Good', color: tones.success.text },
  { label: 'Strong', color: tones.success.text },
];

/** 0 = too short, 4 = strong. Only the length is required; the rest is advice. */
const strengthOf = (password: string) => {
  if (password.length < MIN_PASSWORD_LENGTH) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  return Math.min(4, 1 + (password.length >= 10 ? 1 : 0) + (variety >= 3 ? 2 : variety >= 2 ? 1 : 0));
};

function Rule({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? tones.success.text : colors.mutedIcon}
      />
      <Text style={[styles.ruleText, met && styles.ruleMet]}>{text}</Text>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

  const strength = strengthOf(next);
  const rules = {
    length: next.length >= MIN_PASSWORD_LENGTH,
    different: !!next && next !== current,
    match: !!confirm && confirm === next,
  };
  const ready = !!current && rules.length && rules.different && rules.match;

  const onSave = async () => {
    const found: typeof errors = {};
    if (!current) found.current = 'Please enter your current password.';
    if (next.length < MIN_PASSWORD_LENGTH) found.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    else if (next === current) found.next = 'New password must be different from the current one.';
    if (confirm !== next) found.confirm = 'Passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const { message } = await authApi.changePassword({ old_password: current, new_password: next, confirm_password: confirm });
      showToast(message);
      navigation.goBack();
    } catch (error) {
      handleApiError(error, API_FIELDS, 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={[]} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <IconCircle size={52} radius={14} color={tones.warning.bg}>
              <Ionicons name="key-outline" size={26} color={tones.warning.text} />
            </IconCircle>
            <View style={common.flex}>
              <Text style={common.heading}>Change Password</Text>
              <Text style={common.subtextRelaxed}>Your other devices will be logged out. You stay logged in here.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <FormField label="Current Password" error={errors.current}>
              <InputField
                icon="lock-closed-outline"
                placeholder="Enter your current password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                value={current}
                {...fieldProps('current', setCurrent)}
              />
            </FormField>

            <View style={styles.separator} />

            <FormField label="New Password" error={errors.next}>
              <InputField
                icon="lock-open-outline"
                placeholder="Create a new password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={64}
                value={next}
                {...fieldProps('next', setNext)}
              />
              {next ? (
                <View style={styles.meter} accessibilityLabel={`Password strength: ${STRENGTH[strength]!.label}`}>
                  <View style={styles.bars}>
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        style={[styles.bar, level <= strength && { backgroundColor: STRENGTH[strength]!.color }]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.meterLabel, { color: STRENGTH[strength]!.color }]}>{STRENGTH[strength]!.label}</Text>
                </View>
              ) : null}
            </FormField>

            <FormField label="Confirm New Password" error={errors.confirm} style={styles.lastField}>
              <InputField
                icon="shield-checkmark-outline"
                placeholder="Enter the new password again"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={64}
                value={confirm}
                {...fieldProps('confirm', setConfirm)}
              />
            </FormField>
          </View>

          <View style={styles.rules}>
            <Text style={styles.rulesTitle}>Your new password</Text>
            <Rule met={rules.length} text={`Has at least ${MIN_PASSWORD_LENGTH} characters`} />
            <Rule met={rules.different} text="Is different from your current password" />
            <Rule met={rules.match} text="Matches the confirmation" />
            <Text style={styles.tip}>Tip: mix upper and lower case letters, numbers and symbols for a stronger password.</Text>
          </View>

          <PrimaryButton
            title="Update Password"
            icon="checkmark-circle-outline"
            onPress={onSave}
            loading={saving}
            style={[styles.button, !ready && styles.faded]}
          />
        </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  card: { ...surface, borderRadius: 14, padding: 14 },
  separator: { height: 1, backgroundColor: colors.border, marginBottom: 14 },
  lastField: { marginBottom: 0 },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  meterLabel: { fontFamily: fonts.semiBold, fontSize: 11, minWidth: 56, textAlign: 'right' },
  rules: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.noteBackground,
    borderWidth: 1,
    borderColor: colors.lightGold,
    gap: 6,
  },
  rulesTitle: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark, marginBottom: 2 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  ruleMet: { color: colors.textDark },
  tip: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 4 },
  button: { marginTop: 22 },
  faded: { opacity: 0.6 },
});
