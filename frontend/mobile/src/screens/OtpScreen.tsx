import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';
import { useAuth } from '../auth/AuthContext';
import StepIndicator, { REGISTER_STEPS } from '../components/StepIndicator';
import { BackButton, LotusFooter, OtpInput, OutlineButton, PrimaryButton } from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function OtpScreen({ navigation, route }: Props) {
  const { phone, mode, name } = route.params;
  const { signInMock } = useAuth();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const complete = code.length === OTP_LENGTH;

  const onResend = () => {
    // TODO: call the resend-OTP API.
    setCode('');
    setSeconds(RESEND_SECONDS);
  };

  const onVerify = () => {
    if (!complete) return;
    // TODO: verify the code with the API.
    signInMock();
    if (mode === 'register') navigation.replace('ProfileSetup', { phone, name });
    else navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <BackButton />
          {mode === 'register' ? <StepIndicator steps={REGISTER_STEPS} current={2} /> : null}

          <Text style={styles.heading}>Verify Your Mobile Number</Text>
          <Text style={styles.subtext}>
            Enter the 6-digit verification code sent to{' '}
            <Text style={styles.phone}>{phone ?? 'your mobile number'}</Text>.
          </Text>

          <View style={styles.otp}>
            <OtpInput length={OTP_LENGTH} value={code} onChange={setCode} autoFocus />
          </View>

          <View style={styles.resendRow}>
            <Text style={styles.resendHint}>Didn't receive the code?</Text>
            {seconds > 0 ? (
              <Text style={styles.resend}>Resend OTP ({formatTime(seconds)})</Text>
            ) : (
              <Pressable onPress={onResend} hitSlop={8}>
                <Text style={styles.resend}>Resend OTP</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              title="Verify & Continue"
              onPress={onVerify}
              disabled={!complete}
              style={!complete && styles.faded}
            />
            <OutlineButton title="Change Mobile Number" onPress={() => navigation.goBack()} />
          </View>

          <View style={styles.info}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            <Text style={styles.infoText}>
              Your mobile number will be used for verification and account security.
            </Text>
          </View>

          <View style={styles.footer}>
            <LotusFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg },
  heading: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: spacing.lg },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: spacing.sm },
  phone: { fontFamily: fonts.semiBold, color: colors.textDark },
  otp: { marginTop: spacing.xl },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  resendHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  resend: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  actions: { gap: 12, marginTop: spacing.lg },
  faded: { opacity: 0.5 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FBEFEF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1D9D9',
    padding: 14,
    marginTop: spacing.lg,
  },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  footer: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.md },
});
