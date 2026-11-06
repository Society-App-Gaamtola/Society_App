import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import type { ImageFile } from '../api/auth';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { showApiError } from '../hooks/useFormErrors';
import { pickProfilePhoto } from '../services/profilePhoto';
import {
  AuthScreenLayout,
  AvatarPicker,
  BackButton,
  Checkbox,
  FormField,
  InputField,
  PrimaryButton,
  REGISTER_STEPS,
  StepIndicator,
} from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation, route }: Props) {
  const { updateUser, signOut } = useAuth();
  const [photo, setPhoto] = useState<ImageFile | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [name, setName] = useState(route.params?.name ?? '');
  const [address, setAddress] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && address.trim().length > 0 && agreed;

  const pickPhoto = async () => {
    const result = await pickProfilePhoto();
    if (!result) return;
    if ('error' in result) {
      setPhotoError(result.error);
      return;
    }
    setPhotoError(null);
    setPhoto(result.photo);
  };

  const onCreate = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const { data, message } = await authApi.completeProfile({ username: name.trim(), address: address.trim() }, photo);
      await updateUser(data.userData);
      Alert.alert('Account Created', message, [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) },
      ]);
    } catch (error) {
      showApiError(error, 'Could not save your profile');
    } finally {
      setSubmitting(false);
    }
  };

  // The account already exists at this step, so going back means leaving it. Logging in again returns here.
  const onBack = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <AuthScreenLayout>
      <BackButton onPress={onBack} />

      <StepIndicator steps={REGISTER_STEPS} current={3} />

      <Text style={styles.heading}>Profile & Address</Text>
      <Text style={styles.subtext}>Complete your profile to get the best experience.</Text>

      <AvatarPicker uri={photo?.uri} error={photoError} onPress={pickPhoto} />

      <FormField label="User Name *" required={false} style={styles.field} labelStyle={styles.label}>
        <InputField
          icon="person-outline"
          placeholder="Enter your user name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </FormField>

      <FormField label="Residential Address *" required={false} style={styles.field} labelStyle={styles.label}>
        <InputField
          icon="location-outline"
          placeholder="Enter your address"
          value={address}
          onChangeText={setAddress}
          multiline
          maxLength={256}
          containerStyle={styles.addressBox}
        />
      </FormField>

      <PrimaryButton
        title="Create Account"
        onPress={onCreate}
        disabled={!canSubmit}
        loading={submitting}
        style={[styles.submit, !canSubmit && styles.faded]}
      />

      <Checkbox
        checked={agreed}
        onChange={setAgreed}
        style={styles.terms}
        label={
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.termsBold}>Terms of Use</Text> and{' '}
            <Text style={styles.termsBold}>Privacy Policy</Text>.
          </Text>
        }
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: spacing.lg },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  field: { marginBottom: spacing.md },
  label: { fontSize: 13 },
  addressBox: { minHeight: 110 },
  submit: { marginTop: spacing.sm },
  faded: { opacity: 0.5 },
  terms: { marginTop: spacing.md, alignItems: 'flex-start' },
  termsText: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textDark },
  termsBold: { fontFamily: fonts.semiBold },
});
