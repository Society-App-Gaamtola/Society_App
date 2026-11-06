import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import type { ImageFile } from '../api/auth';
import type { RootStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { useAuth } from '../context/AuthContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { pickProfilePhoto } from '../services/profilePhoto';
import { showToast } from '../utils/toast';
import { isEmail } from '../utils/validation';
import { AppHeader, AvatarPicker, FormField, InputField, KeyboardAvoid, PrimaryButton } from '../components';

type Field = 'username' | 'address' | 'email';

const API_FIELDS: Record<string, Field> = { username: 'username', address: 'address', email: 'email' };

export default function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.name ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photo, setPhoto] = useState<ImageFile | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

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

  const onSave = async () => {
    const next: typeof errors = {};
    const newName = username.trim();
    const newAddress = address.trim();
    const newEmail = email.trim();
    if (newName.length < 2) next.username = 'Name must be at least 2 characters.';
    if (!newAddress) next.address = 'Please enter your address.';
    if (!isEmail(newEmail)) next.email = 'Enter a valid email address.';
    setErrors(next);
    if (Object.keys(next).length) return;

    // Only what changed is sent.
    const changes = {
      username: newName !== user?.name ? newName : undefined,
      address: newAddress !== (user?.address ?? '') ? newAddress : undefined,
      email: newEmail.toLowerCase() !== user?.email?.toLowerCase() ? newEmail : undefined,
    };
    if (!photo && Object.values(changes).every((value) => value === undefined)) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      const { data, message } = await authApi.editProfile(changes, photo);
      await updateUser(data.userData);
      setPhoto(null);
      if (data.new_email) {
        navigation.navigate('Otp', { mode: 'email_change', email: data.new_email, resendAfter: data.resend_after_seconds });
        return;
      }
      showToast(message);
      navigation.goBack();
    } catch (error) {
      handleApiError(error, API_FIELDS, 'Could not update your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={[]} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>Edit Profile</Text>
          <Text style={common.subtext}>Update your personal details.</Text>

          <AvatarPicker uri={photo?.uri ?? user?.photoUrl} error={photoError} onPress={pickPhoto} />

          <FormField label="User Name" error={errors.username}>
            <InputField
              icon="person-outline"
              placeholder="Enter your user name"
              autoCapitalize="words"
              value={username}
              {...fieldProps('username', setUsername)}
            />
          </FormField>

          <FormField label="Email" error={errors.email}>
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

          <FormField label="Mobile Number" required={false}>
            <InputField icon="call-outline" value={`${user?.countryCode ?? ''} ${user?.mobile ?? ''}`.trim()} editable={false} />
          </FormField>

          <FormField label="Residential Address" error={errors.address}>
            <InputField
              icon="location-outline"
              placeholder="Enter your address"
              multiline
              maxLength={256}
              value={address}
              {...fieldProps('address', setAddress)}
            />
          </FormField>

          <PrimaryButton title="Save Changes" onPress={onSave} loading={saving} style={styles.button} />
        </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  button: { marginTop: 4 },
});
