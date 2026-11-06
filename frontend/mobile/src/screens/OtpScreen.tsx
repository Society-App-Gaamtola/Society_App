import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { resetAfterLogin } from '../navigation/navigationRef';
import { colors, fonts, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { showApiError } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import { clearSignupDraft, getSignupDraft } from '../services/signupDraft';
import { formatCountdown } from '../utils/date';
import { AuthScreenLayout, BackButton, OtpInput, OutlineButton, PrimaryButton, REGISTER_STEPS, StepIndicator } from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen({ navigation, route }: Props) {
  const { mode, email, phone, country_code, mobile_number, name, resendAfter } = route.params;
  const { completeLogin, updateUser } = useAuth();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(resendAfter ?? RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const complete = code.length === OTP_LENGTH;
  const isLogin = mode === 'login';

  const requestNewCode = async () => {
    if (mode === 'register') return authApi.sendOtp({ otp_purpose: 'signup', email: email ?? '' });
    if (mode === 'login') return authApi.sendOtp({ otp_purpose: 'login', country_code: country_code ?? '', mobile_number: mobile_number ?? '' });
    return authApi.editProfile({ email });
  };

  const onResend = async () => {
    try {
      const { data } = await requestNewCode();
      setCode('');
      setSeconds(data.resend_after_seconds ?? RESEND_SECONDS);
    } catch (error) {
      const wait = error instanceof ApiError ? error.resendAfter : undefined;
      if (wait) setSeconds(wait);
      showApiError(error, 'Could not resend OTP');
    }
  };

  const verify = async () => {
    if (mode === 'email_change') {
      const { data, message } = await authApi.verifyEmailChange(email ?? '', code);
      await updateUser(data.userData);
      Alert.alert('Email Updated', message);
      navigation.goBack();
      return;
    }

    if (mode === 'login') {
      const { data } = await authApi.verifyLoginOtp(code, { country_code: country_code ?? '', mobile_number: mobile_number ?? '' });
      resetAfterLogin(await completeLogin(data));
      return;
    }

    const draft = getSignupDraft();
    if (!draft) {
      // The app was closed and reopened on this step, so the details are gone.
      Alert.alert('Please try again', 'Your details were not saved. Please enter them again.');
      navigation.goBack();
      return;
    }
    const { data } = await authApi.verifySignupOtp(code, draft);
    clearSignupDraft();
    // The name was entered on the first step; it is saved with the profile on the next one.
    const user = await completeLogin(data);
    navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup', params: { name: name ?? user.name } }] });
  };

  const onVerify = async () => {
    if (!complete || verifying) return;
    setVerifying(true);
    try {
      await verify();
    } catch (error) {
      showApiError(error, 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AuthScreenLayout showScrollIndicator>
      <BackButton />
      {mode === 'register' ? <StepIndicator steps={REGISTER_STEPS} current={2} /> : null}

      <Text style={styles.heading}>{isLogin ? 'Enter Verification Code' : 'Verify Your Email'}</Text>
      <Text style={styles.subtext}>
        Enter the 6-digit verification code sent to{' '}
        {isLogin ? (
          <>
            the email registered with <Text style={styles.highlight}>{phone}</Text>
          </>
        ) : (
          <Text style={styles.highlight}>{email}</Text>
        )}
        .
      </Text>

      <View style={styles.otp}>
        <OtpInput length={OTP_LENGTH} value={code} onChange={setCode} autoFocus />
      </View>

      <View style={styles.resendRow}>
        <Text style={styles.resendHint}>Didn't receive the code?</Text>
        {seconds > 0 ? (
          <Text style={styles.resend}>Resend OTP ({formatCountdown(seconds)})</Text>
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
          loading={verifying}
          style={!complete && styles.faded}
        />
        <OutlineButton title={isLogin ? 'Change Mobile Number' : 'Change Email'} onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.info}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
        <Text style={styles.infoText}>Your email will be used for verification and account security.</Text>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: spacing.lg },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: spacing.sm },
  highlight: { fontFamily: fonts.semiBold, color: colors.textDark },
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
    backgroundColor: colors.softTint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1D9D9',
    padding: 14,
    marginTop: spacing.lg,
  },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
});
