import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { resetAfterLogin } from '../navigation/navigationRef';
import { common } from '../styles/common';
import { colors, fonts, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
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
  type Country,
} from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type Tab = 'password' | 'otp';
type Field = 'identifier' | 'mobile' | 'password' | 'otpMobile';

const TABS: [Tab, string][] = [
  ['password', 'Mobile / Email'],
  ['otp', 'Login with OTP'],
];

const API_FIELDS: Record<string, Field> = { email: 'identifier', mobile_number: 'mobile', password: 'password' };

export default function LoginScreen({ navigation }: Props) {
  const { completeLogin } = useAuth();
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

  return (
    <AuthScreenLayout overlay={<Loader visible={loading} message="Logging in..." language="en" />}>
      <BackButton onPress={() => navigation.replace('LanguageSelect')} />

      <BrandBlock logoSize={120} fontSize={26} lineHeight={40} />

      <Text style={styles.heading}>Member Login</Text>
      <Text style={styles.subtext}>Enter your registered email or mobile number to continue.</Text>

      <View style={styles.tabs}>
        {TABS.map(([key, label]) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => switchTab(key)}
              style={[styles.tab, active && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

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

      <OrDivider style={styles.or} />

      <OutlineButton title="New member? Register here" onPress={() => navigation.navigate('Register')} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },
  tabTextActive: { color: colors.white },
  form: { gap: 14 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helper: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 4, marginLeft: 2 },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: 4, marginLeft: 2 },
  forgot: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  or: { marginVertical: spacing.md },
});
