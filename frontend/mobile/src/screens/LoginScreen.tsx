import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { resetAfterLogin } from '../navigation/navigationRef';
import { common } from '../styles/common';
import { colors, fonts, spacing } from '../theme';
import { useAuth, type LoginAs } from '../context/AuthContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { digitsOnly, INDIA_DIAL_CODE, isEmail, isIndianMobile, isLocalMobile, localIndianNumber, MIN_PASSWORD_LENGTH } from '../utils/validation';
import {
  AuthScreenLayout,
  BackButton,
  BrandBlock,
  Checkbox,
  COUNTRIES,
  CountryCodePicker,
  InputField,
  Loader,
  OrDivider,
  OutlineButton,
  PrimaryButton,
  SegmentedTabs,
  type Country,
} from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type Tab = 'password' | 'otp';
type Field = 'identifier' | 'mobile' | 'password' | 'otpMobile';

const ROLE_TABS = [
  ['member', 'Member', 'person-outline'],
  ['executive', 'Executive', 'ribbon-outline'],
] as const;

const TABS = [
  ['password', 'Mobile / Email'],
  ['otp', 'Login with OTP'],
] as const;

const ROLE_TEXT: Record<LoginAs, { heading: string; subtext: string }> = {
  member: { heading: 'Member Login', subtext: 'Enter your registered email or mobile number to continue.' },
  executive: { heading: 'Executive Login', subtext: 'Use the login details given to you by the Society admin.' },
};

const API_FIELDS: Record<string, Field> = { email: 'identifier', mobile_number: 'mobile', password: 'password' };

export default function LoginScreen({ navigation }: Props) {
  const { completeLogin, setLoginAs } = useAuth();
  const [loginAs, setLoginAsTab] = useState<LoginAs>('member');
  const [tab, setTab] = useState<Tab>('password');
  const [identifier, setIdentifier] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [otpCountry, setOtpCountry] = useState<Country>(COUNTRIES[0]);
  const [otpMobile, setOtpMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

  // Password login, OTP login and sign-up all check the account's role against this tab.
  useEffect(() => setLoginAs(loginAs), [loginAs, setLoginAs]);

  // The first field takes an email or an Indian mobile; the second takes a number for any country.
  const buildCredentials = (id: string) => {
    if (isEmail(id)) return { email: id, password };
    if (id) return { country_code: INDIA_DIAL_CODE, mobile_number: localIndianNumber(id), password };
    return { country_code: country.dial, mobile_number: digitsOnly(mobile), password };
  };

  const onLogin = async () => {
    const next: typeof errors = {};
    const id = identifier.trim();
    if (!id && !mobile.trim()) next.identifier = 'Please enter your email or mobile number.';
    else if (id && !isEmail(id) && !isIndianMobile(id)) next.identifier = 'Enter a valid email or 10-digit mobile number.';
    if (mobile.trim() && !isLocalMobile(mobile)) next.mobile = 'Enter a valid mobile number.';
    if (!password) next.password = 'Please enter your password.';
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const { data } = await authApi.login(buildCredentials(id));
      const user = await completeLogin(data, remember);
      setLoading(false);
      resetAfterLogin(user);
    } catch (error) {
      setLoading(false);
      handleApiError(error, API_FIELDS, 'Login failed');
    }
  };

  const onSendOtp = async () => {
    if (!otpMobile.trim()) return setErrors({ otpMobile: 'Please enter your mobile number.' });
    if (!isLocalMobile(otpMobile)) return setErrors({ otpMobile: 'Enter a valid mobile number.' });
    setErrors({});

    const number = { country_code: otpCountry.dial, mobile_number: digitsOnly(otpMobile) };
    const openOtpScreen = (resendAfter?: number) =>
      navigation.navigate('Otp', { ...number, mode: 'login', phone: `${otpCountry.dial} ${number.mobile_number}`, resendAfter });

    setSendingOtp(true);
    try {
      const { data } = await authApi.sendOtp({ otp_purpose: 'login', ...number });
      openOtpScreen(data.resend_after_seconds);
    } catch (error) {
      // A code sent moments ago is still valid, so continue with it instead of stopping here.
      const wait = error instanceof ApiError ? error.resendAfter : undefined;
      if (wait) openOtpScreen(wait);
      else handleApiError(error, { mobile_number: 'otpMobile' }, 'Could not send OTP');
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
              icon="mail-outline"
              placeholder="Email or Mobile Number"
              value={identifier}
              {...fieldProps('identifier', setIdentifier)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            {errors.identifier ? (
              <Text style={styles.error}>{errors.identifier}</Text>
            ) : (
              <Text style={styles.helper}>example@domain.com or +91 98765 43210</Text>
            )}
          </View>

          <View>
            <View style={styles.row}>
              <CountryCodePicker value={country} onChange={setCountry} />
              <InputField
                placeholder="Mobile Number (Optional)"
                value={mobile}
                {...fieldProps('mobile', setMobile)}
                keyboardType="phone-pad"
                maxLength={15}
                containerStyle={common.flex}
              />
            </View>
            {errors.mobile ? <Text style={styles.error}>{errors.mobile}</Text> : null}
          </View>

          <View>
            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              {...fieldProps('password', setPassword)}
              secureTextEntry
              autoCapitalize="none"
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
            <View style={styles.row}>
              <CountryCodePicker value={otpCountry} onChange={setOtpCountry} />
              <InputField
                placeholder="Mobile Number"
                value={otpMobile}
                {...fieldProps('otpMobile', setOtpMobile)}
                keyboardType="phone-pad"
                maxLength={15}
                containerStyle={common.flex}
              />
            </View>
            {errors.otpMobile ? <Text style={styles.error}>{errors.otpMobile}</Text> : null}
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
  row: { flexDirection: 'row', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helper: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 4, marginLeft: 2 },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: 4, marginLeft: 2 },
  forgot: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  or: { marginVertical: spacing.md },
});
