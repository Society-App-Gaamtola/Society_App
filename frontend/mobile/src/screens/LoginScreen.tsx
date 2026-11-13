import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { resetAfterLogin } from '../navigation/navigationRef';
import { colors, fonts, spacing } from '../theme';
import { useAuth, type LoginAs } from '../context/AuthContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { INDIA_DIAL_CODE, isEmail, isIndianMobile, localIndianNumber, MIN_PASSWORD_LENGTH } from '../utils/validation';
import {
  AuthScreenLayout,
  BackButton,
  BrandBlock,
  Checkbox,
  InputField,
  Loader,
  OrDivider,
  OutlineButton,
  PrimaryButton,
  SegmentedTabs,
} from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type Tab = 'password' | 'otp';
type Field = 'identifier' | 'password' | 'otpEmail';

const ROLE_TABS = [
  ['member', 'Member', 'person-outline'],
  ['executive', 'Executive', 'ribbon-outline'],
] as const;

const TABS = [
  ['password', 'With Password'],
  ['otp', 'Login with OTP'],
] as const;

const ROLE_TEXT: Record<LoginAs, { heading: string; subtext: string }> = {
  member: { heading: 'Member Login', subtext: 'Enter your registered email or mobile number to continue.' },
  executive: { heading: 'Executive Login', subtext: 'Use the login details given to you by the Society admin.' },
};

const API_FIELDS: Record<string, Field> = { email: 'identifier', mobile_number: 'identifier', password: 'password' };

export default function LoginScreen({ navigation }: Props) {
  const { completeLogin, setLoginAs } = useAuth();
  const [loginAs, setLoginAsTab] = useState<LoginAs>('member');
  const [tab, setTab] = useState<Tab>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [otpEmail, setOtpEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

  // Password login, OTP login and sign-up all check the account's role against this tab.
  useEffect(() => setLoginAs(loginAs), [loginAs, setLoginAs]);

  // One field takes either an email or an Indian mobile number (with or without +91).
  const onLogin = async () => {
    const next: typeof errors = {};
    const id = identifier.trim();
    if (!id) next.identifier = 'Please enter your email or mobile number.';
    else if (!isEmail(id) && !isIndianMobile(id)) next.identifier = 'Enter a valid email or 10-digit mobile number.';
    if (!password) next.password = 'Please enter your password.';
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const credentials = isEmail(id)
        ? { email: id, password }
        : { country_code: INDIA_DIAL_CODE, mobile_number: localIndianNumber(id), password };
      const { data } = await authApi.login(credentials);
      const user = await completeLogin(data, remember);
      setLoading(false);
      resetAfterLogin(user);
    } catch (error) {
      setLoading(false);
      handleApiError(error, API_FIELDS, 'Login failed');
    }
  };

  // The code is emailed to the registered email; the OTP screen verifies it and opens Home.
  const onSendOtp = async () => {
    const email = otpEmail.trim().toLowerCase();
    if (!email) return setErrors({ otpEmail: 'Please enter your registered email.' });
    if (!isEmail(email)) return setErrors({ otpEmail: 'Enter a valid email address.' });
    setErrors({});

    const openOtpScreen = (resendAfter?: number) => navigation.navigate('Otp', { mode: 'login', email, resendAfter });

    setSendingOtp(true);
    try {
      const { data } = await authApi.sendOtp({ otp_purpose: 'login', email });
      openOtpScreen(data.resend_after_seconds);
    } catch (error) {
      // A code sent moments ago is still valid, so continue with it instead of stopping here.
      const wait = error instanceof ApiError ? error.resendAfter : undefined;
      if (wait) openOtpScreen(wait);
      else handleApiError(error, { email: 'otpEmail' }, 'Could not send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setErrors({});
  };

  const switchRole = (next: LoginAs) => {
    setLoginAsTab(next);
    setErrors({});
  };

  return (
    <AuthScreenLayout overlay={<Loader visible={loading} message="Logging in..." language="en" />}>
      <BackButton onPress={() => navigation.replace('LanguageSelect')} />

      <BrandBlock logoSize={120} fontSize={26} lineHeight={40} />

      <SegmentedTabs tabs={ROLE_TABS} selected={loginAs} onSelect={switchRole} style={styles.roleTabs} />

      <Text style={styles.heading}>{ROLE_TEXT[loginAs].heading}</Text>
      <Text style={styles.subtext}>{ROLE_TEXT[loginAs].subtext}</Text>

      <SegmentedTabs tabs={TABS} selected={tab} onSelect={switchTab} style={styles.tabs} />

      {tab === 'password' ? (
        <View style={styles.form}>
          <View>
            <InputField
              icon="person-outline"
              placeholder="Email or Mobile Number"
              value={identifier}
              {...fieldProps('identifier', setIdentifier)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
            />
            {errors.identifier ? (
              <Text style={styles.error}>{errors.identifier}</Text>
            ) : (
              <Text style={styles.helper}>example@domain.com or 98765 43210</Text>
            )}
          </View>

          <View>
            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              {...fieldProps('password', setPassword)}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
            />
            {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
          </View>

          <View style={styles.rowBetween}>
            <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
            <Pressable hitSlop={8} onPress={() => Alert.alert('Forgot Password', 'Password reset is coming soon.')}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </Pressable>
          </View>

          <PrimaryButton title="Login" onPress={onLogin} loading={loading} />
        </View>
      ) : (
        <View style={styles.form}>
          <View>
            <InputField
              icon="mail-outline"
              placeholder="Registered Email"
              value={otpEmail}
              {...fieldProps('otpEmail', setOtpEmail)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {errors.otpEmail ? (
              <Text style={styles.error}>{errors.otpEmail}</Text>
            ) : (
              <Text style={styles.helper}>We'll email you a 6-digit code to log in.</Text>
            )}
          </View>

          <PrimaryButton title="Send OTP" onPress={onSendOtp} loading={sendingOtp} />
        </View>
      )}

      {/* Executive accounts are created by the Super Admin, so there is no sign-up for them */}
      {loginAs === 'member' ? (
        <>
          <OrDivider style={styles.or} />
          <OutlineButton title="New member? Register here" onPress={() => navigation.navigate('Register')} />
        </>
      ) : (
        <Text style={styles.adminNote}>
          Executive accounts are created by the Society admin. Contact the admin if you can't log in.
        </Text>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  roleTabs: { marginBottom: spacing.md },
  tabs: { marginTop: spacing.md, marginBottom: spacing.md },
  adminNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  form: { gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helper: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 4, marginLeft: 2 },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: 4, marginLeft: 2 },
  forgot: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  or: { marginVertical: spacing.md },
});
