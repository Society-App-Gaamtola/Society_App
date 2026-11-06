import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import type { RootStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, spacing } from '../theme';
import { useFormErrors } from '../hooks/useFormErrors';
import { setSignupDraft } from '../services/signupDraft';
import { digitsOnly, isEmail, MIN_PASSWORD_LENGTH } from '../utils/validation';
import {
  AuthScreenLayout,
  BackButton,
  COUNTRIES,
  CountryCodePicker,
  FormField,
  InputField,
  PrimaryButton,
  REGISTER_STEPS,
  StepIndicator,
  type Country,
} from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
type Field = 'name' | 'mobile' | 'email' | 'password' | 'confirm';

const API_FIELDS: Record<string, Field> = {
  email: 'email',
  mobile_number: 'mobile',
  password: 'password',
  confirm_password: 'confirm',
};

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

  const digits = digitsOnly(mobile);

  const onNext = async () => {
    const next: typeof errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) next.name = 'Please enter your full name.';
    else if (trimmedName.length < 2) next.name = 'Name must be at least 2 characters.';
    if (!digits) next.mobile = 'Please enter your mobile number.';
    else if (digits.length < 7 || digits.length > 15) next.mobile = 'Enter a valid mobile number.';
    if (!trimmedEmail) next.email = 'Please enter your email address.';
    else if (!isEmail(trimmedEmail)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Please create a password.';
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const details = { email: trimmedEmail, country_code: country.dial, mobile_number: digits, password };
    setSubmitting(true);
    try {
      const { data } = await authApi.signUp({ ...details, confirm_password: confirm });
      setSignupDraft(details);
      navigation.navigate('Otp', { mode: 'register', email: trimmedEmail, name: trimmedName, resendAfter: data.resend_after_seconds });
    } catch (error) {
      handleApiError(error, API_FIELDS, 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = { style: styles.field, labelStyle: styles.label };

  return (
    <AuthScreenLayout>
      <BackButton />
      <StepIndicator steps={REGISTER_STEPS} current={1} />

      <Text style={styles.heading}>Personal Details</Text>
      <Text style={styles.subtext}>Enter your details to create a member account.</Text>

      <FormField {...fieldStyle} label="Full Name" error={errors.name}>
        <InputField
          icon="person-outline"
          placeholder="Enter your full name"
          autoCapitalize="words"
          value={name}
          {...fieldProps('name', setName)}
        />
      </FormField>

      <FormField {...fieldStyle} label="Mobile Number" error={errors.mobile}>
        <View style={styles.row}>
          <CountryCodePicker value={country} onChange={setCountry} />
          <InputField
            placeholder="Mobile Number"
            keyboardType="phone-pad"
            maxLength={15}
            value={mobile}
            {...fieldProps('mobile', setMobile)}
            containerStyle={common.flex}
          />
        </View>
      </FormField>

      <FormField {...fieldStyle} label="Email" error={errors.email}>
        <InputField
          icon="mail-outline"
          placeholder="example@domain.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          {...fieldProps('email', setEmail)}
        />
      </FormField>

      <FormField {...fieldStyle} label="Password" error={errors.password}>
        <InputField
          icon="lock-closed-outline"
          placeholder="Create a password"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          {...fieldProps('password', setPassword)}
        />
      </FormField>

      <FormField {...fieldStyle} label="Confirm Password" error={errors.confirm}>
        <InputField
          icon="lock-closed-outline"
          placeholder="Enter the password again"
          secureTextEntry
          autoCapitalize="none"
          value={confirm}
          {...fieldProps('confirm', setConfirm)}
        />
      </FormField>

      <PrimaryButton title="Next" onPress={onNext} loading={submitting} style={styles.button} />

      <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.loginLink}>
        <Text style={styles.loginText}>
          Already a member? <Text style={styles.loginBold}>Login</Text>
        </Text>
      </Pressable>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: spacing.lg },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  label: { fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.sm },
  button: { marginTop: spacing.sm },
  loginLink: { alignSelf: 'center', marginTop: spacing.md },
  loginText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  loginBold: { fontFamily: fonts.semiBold, color: colors.primary },
});
