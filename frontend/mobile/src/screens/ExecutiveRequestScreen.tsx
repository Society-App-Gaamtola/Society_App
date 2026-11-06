import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { common } from '../styles/common';
import { colors, fonts, PRIMARY_GRADIENT, tones, type Tone } from '../theme';
import { MAX_UPLOAD_BYTES, MIN_EXECUTIVE_DONATION, STORAGE_KEYS } from '../config';
import { Ionicons, MaterialCommunityIcons } from '../icons';
import { formatINR } from '../utils/format';
import { AppHeader, Checkbox, FormField, InputField, KeyboardAvoid, Pill, PrimaryButton } from '../components';

type RequestStatus = 'Not submitted' | 'Pending review' | 'Approved' | 'Rejected';
type PickedFile = { name: string; uri: string; size?: number; mimeType?: string };

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const statusStyle: Record<RequestStatus, Tone> = {
  'Not submitted': tones.danger,
  'Pending review': tones.warning,
  Approved: tones.success,
  Rejected: tones.danger,
};

export default function ExecutiveRequestScreen() {
  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [contact, setContact] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [declared, setDeclared] = useState(false);
  const [status, setStatus] = useState<RequestStatus>('Not submitted');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.executiveRequestStatus)
      .then((saved) => {
        if (saved && saved in statusStyle) setStatus(saved as RequestStatus);
      })
      .catch(() => {});
  }, []);

  const canSubmit =
    [name, memberId, contact, reference, reason].every((v) => v.trim().length > 0) &&
    !!file &&
    declared &&
    !submitting;

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_UPLOAD_BYTES) {
      setFileError('File must be smaller than 5MB.');
      return;
    }
    setFileError(null);
    setFile({ name: asset.name, uri: asset.uri, size: asset.size, mimeType: asset.mimeType });
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    // TODO: upload the form and payment proof to the API.
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.executiveRequestStatus, 'Pending review');
    } catch {
      // Status still updates on screen even if it could not be saved.
    }
    setStatus('Pending review');
    setSubmitting(false);
    Alert.alert('Request Submitted', 'Your executive membership request has been sent for admin review.');
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>Executive Membership Request</Text>
          <Text style={common.subtextRelaxed}>
            Apply for executive membership and be a part of your society's leadership team.
          </Text>

          <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
            <View style={styles.bannerIcon}>
              <MaterialCommunityIcons name="crown-outline" size={24} color={colors.white} />
            </View>
            <View style={common.flex}>
              <Text style={styles.bannerTitle}>Become an Executive Member</Text>
              <Text style={styles.bannerText}>
                Executive membership access is granted only after a minimum donation of{' '}
                {formatINR(MIN_EXECUTIVE_DONATION)} and approval from the admin team. This helps us maintain
                transparency and ensure active participation in the society's decision-making process.
              </Text>
            </View>
          </LinearGradient>

          <Text style={styles.formTitle}>Application Form</Text>

          <FormField label="Member Name">
            <InputField placeholder="Enter your full name" value={name} onChangeText={setName} autoCapitalize="words" />
          </FormField>

          <FormField label="Member ID">
            <InputField placeholder="Enter your member ID (if any)" value={memberId} onChangeText={setMemberId} />
          </FormField>

          <View style={styles.row}>
            <FormField label="Contact Number" style={common.flex}>
              <InputField
                placeholder="+91 98765 43210"
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
                maxLength={16}
              />
            </FormField>
            <FormField label="Donation Reference" style={common.flex}>
              <InputField
                placeholder="Transaction ID / UPI Ref No."
                value={reference}
                onChangeText={setReference}
                autoCapitalize="characters"
              />
            </FormField>
          </View>

          <FormField label="Reason for Executive Membership">
            <InputField
              placeholder="Write a brief reason for your application..."
              value={reason}
              onChangeText={setReason}
              multiline
              containerStyle={styles.reason}
              style={styles.reasonInput}
            />
          </FormField>

          <FormField label="Upload Payment Proof" error={fileError}>
            {file ? (
              <View style={styles.fileRow}>
                <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Pressable onPress={() => setFile(null)} hitSlop={10} accessibilityLabel="Remove file">
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.upload} onPress={pickFile} accessibilityRole="button">
                <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                <Text style={styles.uploadText}>Choose file or drag and drop</Text>
                <Text style={styles.uploadHint}>PDF, JPG, PNG (Max 5MB)</Text>
              </Pressable>
            )}
          </FormField>

          <Checkbox
            checked={declared}
            onChange={setDeclared}
            style={styles.declare}
            label={
              <Text style={styles.declareText}>
                I hereby declare that the information provided above is true and correct.
              </Text>
            }
          />

          <PrimaryButton
            title="Submit Request"
            icon="send"
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
            style={[styles.submit, !canSubmit && styles.faded]}
          />

          <View style={styles.status}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.statusLabel}>Application status</Text>
            <Pill label={status} tone={statusStyle[status]} />
          </View>
        </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },

  banner: { flexDirection: 'row', gap: 12, borderRadius: 12, padding: 14, marginTop: 14 },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  bannerText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  formTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, marginTop: 20, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  reason: { minHeight: 90 },
  reasonInput: { minHeight: 66 },

  upload: {
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  uploadText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  uploadHint: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  fileName: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },

  declare: { alignItems: 'flex-start', marginTop: 4 },
  declareText: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textDark },
  submit: { marginTop: 16 },
  faded: { opacity: 0.5 },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statusLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
});
