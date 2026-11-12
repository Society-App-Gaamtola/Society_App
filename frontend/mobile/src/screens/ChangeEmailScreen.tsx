import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import type { RootStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import { isEmail } from '../utils/validation';
import { EMAIL_CHANGE_STEPS } from '../config';
import {
  AppHeader,
  FormField,
  IconCircle,
  InputField,
  KeyboardAvoid,
  OutlineButton,
  Pill,
  PrimaryButton,
  StepIndicator,
} from '../components';

type Field = 'email';

export default function ChangeEmailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  /** The address a code was sent to; once the account shows it, the change is done. */
  const [pending, setPending] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

  const currentEmail = user?.email ?? '';
  const done = !!pending && currentEmail.toLowerCase() === pending.toLowerCase();

  const onSendCode = async () => {
    const next = email.trim();
    if (!isEmail(next)) return setErrors({ email: 'Enter a valid email address.' });
    if (next.toLowerCase() === currentEmail.toLowerCase()) return setErrors({ email: 'This is already your email address.' });
    setErrors({});

    setSending(true);
    try {
      const { data } = await authApi.editProfile({ email: next });
      const sentTo = data.new_email ?? next;
      setPending(sentTo);
      navigation.navigate('Otp', { mode: 'email_change', email: sentTo, resendAfter: data.resend_after_seconds });
    } catch (error) {
      handleApiError(error, { email: 'email' }, 'Could not send the code');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <View style={common.screen}>
        <AppHeader leftType="back" rightIcons={[]} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <StepIndicator steps={EMAIL_CHANGE_STEPS} current={3} />
          <View style={styles.success}>
            <IconCircle size={76} color={tones.success.bg}>
              <Ionicons name="checkmark-circle" size={44} color={tones.success.text} />
            </IconCircle>
            <Text style={styles.successTitle}>Email updated</Text>
            <Text style={styles.successText}>
              You will now receive codes and updates at{'\n'}
              <Text style={styles.strong}>{currentEmail}</Text>
            </Text>
          </View>
          <PrimaryButton title="Back to Profile" onPress={() => navigation.goBack()} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={[]} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>Change Email</Text>
          <Text style={[common.subtextRelaxed, styles.subtext]}>
            We'll send a 6-digit code to your new email. Your current email keeps working until you verify it.
          </Text>

          <StepIndicator steps={EMAIL_CHANGE_STEPS} current={1} />

          <View style={styles.current}>
            <IconCircle size={40} radius={10} color={tones.info.bg}>
              <Ionicons name="mail-outline" size={20} color={tones.info.text} />
            </IconCircle>
            <View style={common.flex}>
              <Text style={styles.currentLabel}>Current email</Text>
              <Text style={styles.currentValue} numberOfLines={1}>
                {currentEmail || 'Not added'}
              </Text>
            </View>
            {currentEmail && user?.emailVerified !== undefined ? (
              <Pill
                label={user?.emailVerified ? 'Verified' : 'Not verified'}
                tone={user?.emailVerified ? tones.success : tones.warning}
              />
            ) : null}
          </View>

          <FormField label="New Email Address" error={errors.email}>
            <InputField
              icon="at-outline"
              placeholder="example@domain.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={onSendCode}
              value={email}
              {...fieldProps('email', setEmail)}
            />
          </FormField>

          <PrimaryButton title="Send Verification Code" icon="paper-plane-outline" onPress={onSendCode} loading={sending} />
          {pending ? (
            <OutlineButton
              title="I already have a code"
              onPress={() => navigation.navigate('Otp', { mode: 'email_change', email: pending, resendAfter: 0 })}
              style={styles.secondary}
            />
          ) : null}

          <View style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.noteText}>
              The code expires in a few minutes. Check your spam folder if you don't see it.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  subtext: { marginBottom: 18 },
  current: {
    ...surface,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginTop: 20,
    marginBottom: 18,
  },
  currentLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  currentValue: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  secondary: { marginTop: 12 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.softTint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1D9D9',
    padding: 14,
    marginTop: 20,
  },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  success: { alignItems: 'center', marginVertical: 32, gap: 8 },
  successTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.textDark, marginTop: 8 },
  successText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  strong: { fontFamily: fonts.semiBold, color: colors.textDark },
});
