import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';
import {
  BackButton,
  Checkbox,
  COUNTRIES,
  CountryCodePicker,
  InputField,
  Loader,
  LotusFooter,
  OutlineButton,
  PrimaryButton,
  type Country,
} from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type Tab = 'password' | 'otp';
type Errors = Partial<Record<'identifier' | 'mobile' | 'password' | 'otpMobile', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TAB_INACTIVE = '#EFEAE4';
const ERROR = '#C62828';

const digitsOnly = (s: string) => s.replace(/\D/g, '');
/** Accepts 10 digits, optionally prefixed with +91 / 91 / 0. */
const isMobile = (s: string) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(s.replace(/[\s-]/g, ''));
const isLocalMobile = (s: string) => /^\d{6,14}$/.test(digitsOnly(s));

export default function LoginScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('password');
  const [identifier, setIdentifier] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [otpCountry, setOtpCountry] = useState<Country>(COUNTRIES[0]);
  const [otpMobile, setOtpMobile] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const clearError = (key: keyof Errors) => setErrors((e) => ({ ...e, [key]: undefined }));

  const onLogin = () => {
    const next: Errors = {};
    const id = identifier.trim();
    if (!id) next.identifier = 'Please enter your email or mobile number.';
    else if (!EMAIL_RE.test(id) && !isMobile(id)) next.identifier = 'Enter a valid email or 10-digit mobile number.';
    if (mobile.trim() && !isLocalMobile(mobile)) next.mobile = 'Enter a valid mobile number.';
    if (!password) next.password = 'Please enter your password.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    // TODO: call the login API.
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Login', 'Login API is not connected yet.');
    }, 800);
  };

  const onSendOtp = () => {
    if (!otpMobile.trim()) return setErrors({ otpMobile: 'Please enter your mobile number.' });
    if (!isLocalMobile(otpMobile)) return setErrors({ otpMobile: 'Enter a valid mobile number.' });
    setErrors({});
    navigation.navigate('Otp', { phone: `${otpCountry.dial} ${digitsOnly(otpMobile)}`, mode: 'login' });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setErrors({});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={() => navigation.replace('LanguageSelect')} />

          <View style={styles.brand}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandTitle}>{'શ્રી ગામટોળા\nયુવક મિત્ર મંડળ'}</Text>
          </View>

          <Text style={styles.heading}>Member Login</Text>
          <Text style={styles.subtext}>Enter your registered email or mobile number to continue.</Text>

          <View style={styles.tabs}>
            {(
              [
                ['password', 'Mobile / Email'],
                ['otp', 'Login with OTP'],
              ] as const
            ).map(([key, label]) => {
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
                  onChangeText={(v) => {
                    setIdentifier(v);
                    clearError('identifier');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  containerStyle={errors.identifier ? styles.inputError : undefined}
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
                    onChangeText={(v) => {
                      setMobile(v);
                      clearError('mobile');
                    }}
                    keyboardType="phone-pad"
                    maxLength={15}
                    containerStyle={[styles.flex, errors.mobile ? styles.inputError : undefined]}
                  />
                </View>
                {errors.mobile ? <Text style={styles.error}>{errors.mobile}</Text> : null}
              </View>

              <View>
                <InputField
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    clearError('password');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  containerStyle={errors.password ? styles.inputError : undefined}
                />
                {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
              </View>

              <View style={styles.rowBetween}>
                <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
                <Pressable
                  hitSlop={8}
                  onPress={() => Alert.alert('Forgot Password', 'Password reset is coming soon.')}
                >
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
                    onChangeText={(v) => {
                      setOtpMobile(v);
                      clearError('otpMobile');
                    }}
                    keyboardType="phone-pad"
                    maxLength={15}
                    containerStyle={[styles.flex, errors.otpMobile ? styles.inputError : undefined]}
                  />
                </View>
                {errors.otpMobile ? <Text style={styles.error}>{errors.otpMobile}</Text> : null}
              </View>

              <PrimaryButton title="Send OTP" onPress={onSendOtp} />
            </View>
          )}

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <OutlineButton
            title="New member? Register here"
            onPress={() => navigation.navigate('Register')}
          />

          <View style={styles.footer}>
            <LotusFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Loader overlay visible={loading} message="Logging in..." language="en" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg },
  brand: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 120, height: 120, marginBottom: spacing.sm },
  brandTitle: {
    fontFamily: fonts.gujaratiHeading,
    fontSize: 26,
    lineHeight: 40,
    color: colors.primary,
    textAlign: 'center',
  },
  heading: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: TAB_INACTIVE,
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
  error: { fontFamily: fonts.regular, fontSize: 11, color: ERROR, marginTop: 4, marginLeft: 2 },
  inputError: { borderColor: ERROR },
  forgot: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  footer: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.md },
});
