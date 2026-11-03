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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';
import { useAuth } from '../auth/AuthContext';
import StepIndicator, { REGISTER_STEPS } from '../components/StepIndicator';
import { BackButton, Checkbox, InputField, LotusFooter, PrimaryButton } from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

const AVATAR_SIZE = 110;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ERROR = '#C62828';

const mimeFromName = (name: string) => {
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return undefined;
};

export default function ProfileSetupScreen({ navigation, route }: Props) {
  const { signInMock } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [name, setName] = useState(route.params?.name ?? '');
  const [address, setAddress] = useState('');
  const [agreed, setAgreed] = useState(false);

  const canSubmit = name.trim().length > 0 && address.trim().length > 0 && agreed;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const type = asset.mimeType ?? mimeFromName(asset.fileName ?? asset.uri);
    if (!type || !ALLOWED_TYPES.includes(type)) {
      setPhotoError('Only JPG or PNG images are allowed.');
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
      setPhotoError('Image must be smaller than 2MB.');
      return;
    }
    setPhotoError(null);
    setPhoto(asset.uri);
  };

  const onCreate = () => {
    if (!canSubmit) return;
    // TODO: send the profile and photo to the API.
    Alert.alert('Account Created', 'Your account has been created successfully.', [
      {
        text: 'OK',
        onPress: () => {
          signInMock();
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton />

          <StepIndicator steps={REGISTER_STEPS} current={3} />

          <Text style={styles.heading}>Profile & Address</Text>
          <Text style={styles.subtext}>Complete your profile to get the best experience.</Text>

          <View style={styles.avatarSection}>
            <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Upload profile photo">
              <View style={styles.avatar}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="camera-outline" size={36} color="#9A8F86" />
                )}
              </View>
              <View style={styles.badge}>
                <Ionicons name="add" size={18} color={colors.white} />
              </View>
            </Pressable>
            <Text style={styles.uploadTitle}>Upload Profile Photo</Text>
            <Text style={styles.uploadHint}>JPG, PNG (Max 2MB)</Text>
            {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>User Name *</Text>
            <InputField
              icon="person-outline"
              placeholder="Enter your user name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Residential Address *</Text>
            <InputField
              icon="location-outline"
              placeholder="Enter your address"
              value={address}
              onChangeText={setAddress}
              multiline
              containerStyle={styles.addressBox}
            />
          </View>

          <PrimaryButton
            title="Create Account"
            onPress={onCreate}
            disabled={!canSubmit}
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

          <View style={styles.footer}>
            <LotusFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg },
  heading: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: spacing.lg },
  subtext: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  avatarSection: { alignItems: 'center', marginVertical: spacing.lg },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#EFE6DC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark, marginTop: spacing.sm },
  uploadHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  error: { fontFamily: fonts.regular, fontSize: 11, color: ERROR, marginTop: 4 },
  field: { marginBottom: spacing.md },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, marginBottom: 6 },
  addressBox: { minHeight: 110 },
  submit: { marginTop: spacing.sm },
  faded: { opacity: 0.5 },
  terms: { marginTop: spacing.md, alignItems: 'flex-start' },
  termsText: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textDark },
  termsBold: { fontFamily: fonts.semiBold },
  footer: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.md },
});
