import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';
import {
  BackButton,
  COUNTRIES,
  CountryCodePicker,
  InputField,
  LotusFooter,
  PrimaryButton,
  type Country,
} from '../components';
import StepIndicator, { REGISTER_STEPS } from '../components/StepIndicator';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
type Field = 'name' | 'mobile' | 'email' | 'password' | 'confirm';
type Errors = Partial<Record<Field, string>>;

const ERROR = '#C62828';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 6;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const clear = (field: Field) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  const digits = mobile.replace(/\D/g, '');

  const onNext = () => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Please enter your full name.';
    if (!digits) next.mobile = 'Please enter your mobile number.';
    else if (digits.length < 6 || digits.length > 14) next.mobile = 'Enter a valid mobile number.';
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Please create a password.';
    else if (password.length < MIN_PASSWORD) next.password = `Password must be at least ${MIN_PASSWORD} characters.`;
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    // TODO: send the registration details to the API and request the OTP.
    navigation.navigate('Otp', { phone: `${country.dial} ${digits}`, mode: 'register', name: name.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackButton />
          <StepIndicator steps={REGISTER_STEPS} current={1} />

          <Text style={styles.heading}>Personal Details</Text>
          <Text style={styles.subtext}>Enter your details to create a member account.</Text>

          <FieldBlock label="Full Name" error={errors.name}>
            <InputField
              icon="person-outline"
              placeholder="Enter your full name"
              autoCapitalize="words"
              value={name}
              onChangeText={(v) => {
                setName(v);
                clear('name');
              }}
              containerStyle={errors.name ? styles.inputError : undefined}
            />
          </FieldBlock>

          <FieldBlock label="Mobile Number" error={errors.mobile}>
            <View style={styles.row}>
              <CountryCodePicker value={country} onChange={setCountry} />
              <InputField
                placeholder="Mobile Number"
                keyboardType="phone-pad"
                maxLength={15}
                value={mobile}
                onChangeText={(v) => {
                  setMobile(v);
                  clear('mobile');
                }}
                containerStyle={[styles.flex, errors.mobile ? styles.inputError : undefined]}
              />
            </View>
          </FieldBlock>

          <FieldBlock label="Email (Optional)" required={false} error={errors.email}>
            <InputField
              icon="mail-outline"
              placeholder="example@domain.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clear('email');
              }}
              containerStyle={errors.email ? styles.inputError : undefined}
            />
          </FieldBlock>

          <FieldBlock label="Password" error={errors.password}>
            <InputField
              icon="lock-closed-outline"
              placeholder="Create a password"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clear('password');
              }}
              containerStyle={errors.password ? styles.inputError : undefined}
            />
          </FieldBlock>

          <FieldBlock label="Confirm Password" error={errors.confirm}>
            <InputField
              icon="lock-closed-outline"
              placeholder="Enter the password again"
              secureTextEntry
              autoCapitalize="none"
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                clear('confirm');
              }}
              containerStyle={errors.confirm ? styles.inputError : undefined}
            />
          </FieldBlock>

          <PrimaryButton title="Next" onPress={onNext} style={styles.button} />

          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already a member? <Text style={styles.loginBold}>Login</Text>
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <LotusFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldBlock({
  label,
  error,
  required = true,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg },
  heading: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: spacing.lg },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, marginBottom: 6 },
  required: { color: ERROR },
  error: { fontFamily: fonts.regular, fontSize: 11, color: ERROR, marginTop: 4 },
  inputError: { borderColor: ERROR },
  row: { flexDirection: 'row', gap: spacing.sm },
  button: { marginTop: spacing.sm },
  loginLink: { alignSelf: 'center', marginTop: spacing.md },
  loginText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  loginBold: { fontFamily: fonts.semiBold, color: colors.primary },
  footer: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.md },
});
