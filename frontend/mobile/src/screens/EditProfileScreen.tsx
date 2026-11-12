import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import type { ImageFile } from '../api/auth';
import type { SharedStackParams } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons, type IoniconName } from '../icons';
import { pickProfilePhoto } from '../services/profilePhoto';
import { showToast } from '../utils/toast';
import { AppHeader, FormField, IconCircle, InputField, KeyboardAvoid, Pill, PrimaryButton } from '../components';
import ProfileAvatar from '../components/profile/ProfileAvatar';

type Field = 'username' | 'address';

const API_FIELDS: Record<string, Field> = { username: 'username', address: 'address' };

type LockedRowProps = { icon: IoniconName; label: string; value: string; action?: { title: string; onPress: () => void }; hint?: string; badge?: React.ReactNode };

/** A value that is changed somewhere else, or not at all. */
function LockedRow({ icon, label, value, action, hint, badge }: LockedRowProps) {
  return (
    <View style={styles.locked}>
      <IconCircle size={36} radius={10} color={colors.noteBackground}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </IconCircle>
      <View style={common.flex}>
        <View style={styles.lockedLabelRow}>
          <Text style={styles.lockedLabel}>{label}</Text>
          {badge}
        </View>
        <Text style={styles.lockedValue} numberOfLines={1}>
          {value || 'Not added'}
        </Text>
        {hint ? <Text style={styles.lockedHint}>{hint}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} style={styles.changeButton} accessibilityRole="button" accessibilityLabel={`${action.title} ${label}`}>
          <Text style={styles.changeText}>{action.title}</Text>
        </Pressable>
      ) : (
        <Ionicons name="lock-closed-outline" size={16} color={colors.mutedIcon} />
      )}
    </View>
  );
}

export default function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SharedStackParams>>();
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.name ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [photo, setPhoto] = useState<ImageFile | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { errors, setErrors, fieldProps, handleApiError } = useFormErrors<Field>();

  const newName = username.trim();
  const newAddress = address.trim();
  const nameChanged = newName !== (user?.name ?? '');
  const addressChanged = newAddress !== (user?.address ?? '');
  const dirty = !!photo || nameChanged || addressChanged;

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
    if (newName.length < 2) next.username = 'Name must be at least 2 characters.';
    if (!newAddress) next.address = 'Please enter your address.';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!dirty) return;

    setSaving(true);
    try {
      // Only what changed is sent.
      const { data, message } = await authApi.editProfile(
        { username: nameChanged ? newName : undefined, address: addressChanged ? newAddress : undefined },
        photo,
      );
      await updateUser(data.userData);
      setPhoto(null);
      showToast(message);
      navigation.goBack();
    } catch (error) {
      handleApiError(error, API_FIELDS, 'Could not update your profile');
    } finally {
      setSaving(false);
    }
  };

  const phone = `${user?.countryCode ?? ''} ${user?.mobile ?? ''}`.trim();

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={[]} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>Edit Profile</Text>
          <Text style={common.subtext}>Keep your details up to date for the society records.</Text>

          {/* Photo */}
          <View style={styles.photoSection}>
            <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Change profile photo">
              <ProfileAvatar name={newName || user?.name} uri={photo?.uri ?? user?.photoUrl} size={104} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </Pressable>
            <Pressable onPress={pickPhoto} hitSlop={6} accessibilityRole="button">
              <Text style={styles.photoAction}>{photo ? 'Choose a different photo' : 'Change photo'}</Text>
            </Pressable>
            <Text style={styles.photoHint}>JPG or PNG, up to 2 MB</Text>
            {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
          </View>

          {/* Editable details */}
          <Text style={styles.sectionTitle}>Basic Details</Text>
          <View style={styles.card}>
            <FormField label="Full Name" error={errors.username}>
              <InputField
                icon="person-outline"
                placeholder="Enter your full name"
                autoCapitalize="words"
                maxLength={100}
                value={username}
                {...fieldProps('username', setUsername)}
              />
            </FormField>

            <FormField label="Residential Address" error={errors.address} style={styles.lastField}>
              <InputField
                icon="location-outline"
                placeholder="House no., street, area, city"
                multiline
                maxLength={256}
                value={address}
                {...fieldProps('address', setAddress)}
              />
              <Text style={styles.counter}>{address.length}/256</Text>
            </FormField>
          </View>

          {/* Contact details changed elsewhere */}
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={[styles.card, styles.cardFlush]}>
            <LockedRow
              icon="mail-outline"
              label="Email"
              value={user?.email ?? ''}
              badge={
                user?.email && user.emailVerified !== undefined ? (
                  <Pill label={user.emailVerified ? 'Verified' : 'Not verified'} tone={user.emailVerified ? tones.success : tones.warning} />
                ) : null
              }
              hint="Changing it needs a code sent to the new email."
              action={{ title: 'Change', onPress: () => navigation.navigate('ChangeEmail') }}
            />
            <View style={styles.divider} />
            <LockedRow icon="call-outline" label="Mobile Number" value={phone} hint="Contact the committee to change your number." />
          </View>

          <PrimaryButton
            title={dirty ? 'Save Changes' : 'No changes to save'}
            icon={dirty ? 'checkmark-circle-outline' : undefined}
            onPress={onSave}
            disabled={!dirty}
            loading={saving}
            style={[styles.button, !dirty && styles.faded]}
          />
        </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  photoSection: { alignItems: 'center', marginTop: 20, marginBottom: 8 },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAction: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary, marginTop: 10 },
  photoHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  photoError: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: 4 },

  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { ...surface, borderRadius: 14, padding: 14 },
  cardFlush: { padding: 0, overflow: 'hidden' },
  lastField: { marginBottom: 0 },
  counter: { fontFamily: fonts.regular, fontSize: 10, color: colors.placeholder, textAlign: 'right', marginTop: 4 },

  locked: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lockedLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockedLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  lockedValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark, marginTop: 1 },
  lockedHint: { fontFamily: fonts.regular, fontSize: 10, color: colors.placeholder, marginTop: 2 },
  changeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.tint },
  changeText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 62 },

  button: { marginTop: 24 },
  faded: { opacity: 0.5 },
});
