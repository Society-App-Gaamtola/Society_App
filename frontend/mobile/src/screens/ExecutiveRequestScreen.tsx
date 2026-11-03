import { useEffect, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { MIN_EXECUTIVE_DONATION, STORAGE_KEYS } from '../config';
import { formatINR } from '../utils/format';
import { AppHeader, Checkbox, InputField, PrimaryButton } from '../components';

type RequestStatus = 'Not submitted' | 'Pending review' | 'Approved' | 'Rejected';
type PickedFile = { name: string; uri: string; size?: number; mimeType?: string };

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const REQUIRED = '#C62828';

const statusStyle: Record<RequestStatus, { text: string; bg: string }> = {
  'Not submitted': { text: '#C62828', bg: '#FDECEC' },
  'Pending review': { text: '#E0700B', bg: '#FFF1E0' },
  Approved: { text: '#1E8E4E', bg: '#E6F6EC' },
  Rejected: { text: '#C62828', bg: '#FDECEC' },
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
    if (asset.size && asset.size > MAX_FILE_BYTES) {
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

  const badge = statusStyle[status];

  return (
    <View style={styles.container}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Executive Membership Request</Text>
          <Text style={styles.subtext}>
            Apply for executive membership and be a part of your society's leadership team.
          </Text>

          <LinearGradient colors={['#8E1426', '#6A0D1B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
            <View style={styles.bannerIcon}>
              <MaterialCommunityIcons name="crown-outline" size={24} color={colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.bannerTitle}>Become an Executive Member</Text>
              <Text style={styles.bannerText}>
                Executive membership access is granted only after a minimum donation of{' '}
                {formatINR(MIN_EXECUTIVE_DONATION)} and approval from the admin team. This helps us maintain
                transparency and ensure active participation in the society's decision-making process.
              </Text>
            </View>
          </LinearGradient>

          <Text style={styles.formTitle}>Application Form</Text>

          <Field label="Member Name">
            <InputField placeholder="Enter your full name" value={name} onChangeText={setName} autoCapitalize="words" />
          </Field>

          <Field label="Member ID">
            <InputField placeholder="Enter your member ID (if any)" value={memberId} onChangeText={setMemberId} />
          </Field>

          <View style={styles.row}>
            <Field label="Contact Number" style={styles.flex}>
              <InputField
                placeholder="+91 98765 43210"
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
                maxLength={16}
              />
            </Field>
            <Field label="Donation Reference" style={styles.flex}>
              <InputField
                placeholder="Transaction ID / UPI Ref No."
                value={reference}
                onChangeText={setReference}
                autoCapitalize="characters"
              />
            </Field>
          </View>

          <Field label="Reason for Executive Membership">
            <InputField
              placeholder="Write a brief reason for your application..."
              value={reason}
              onChangeText={setReason}
              multiline
              containerStyle={styles.reason}
              style={styles.reasonInput}
            />
          </Field>

          <Field label="Upload Payment Proof">
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
            {fileError ? <Text style={styles.error}>{fileError}</Text> : null}
          </Field>

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
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusText, { color: badge.text }]}>{status}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },

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
  field: { marginBottom: 14 },
  label: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark, marginBottom: 6 },
  required: { color: REQUIRED },
  row: { flexDirection: 'row', gap: 10 },
  reason: { minHeight: 90 },
  reasonInput: { minHeight: 66 },

  upload: {
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D9CBB8',
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
  error: { fontFamily: fonts.regular, fontSize: 11, color: REQUIRED, marginTop: 4 },

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
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  statusText: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },
});
