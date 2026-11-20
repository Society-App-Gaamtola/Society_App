import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { common } from '../styles/common';
import { colors, fonts, PRIMARY_GRADIENT, tones, type Tone, themedStyles } from '../theme';
import { MAX_UPLOAD_BYTES, MIN_EXECUTIVE_DONATION } from '../config';
import { useAuth } from '../context/AuthContext';
import { createExecutiveRequest, getExecutiveRequest, type ApiExecutiveApplication } from '../api/member';
import { mediaFolder, uploadMedia } from '../services/media';
import { Ionicons, MaterialCommunityIcons } from '../icons';
import { formatDate } from '../utils/date';
import { formatINR } from '../utils/format';
import { digitsOnly } from '../utils/validation';
import { AppHeader, Checkbox, FormField, InputField, KeyboardAvoid, Pill, PrimaryButton } from '../components';
import { useT } from '../i18n';

type RequestStatus = 'Not submitted' | 'Pending review' | 'Approved' | 'Rejected';
type PickedFile = { name: string; uri: string; size?: number; mimeType?: string };

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const statusStyle: Record<RequestStatus, Tone> = {
  'Not submitted': tones.danger,
  'Pending review': tones.warning,
  Approved: tones.success,
  Rejected: tones.danger,
};

const STATUS_LABEL: Record<ApiExecutiveApplication['status'], RequestStatus> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Rejected',
};

// The request and its status live on the backend (GET / POST /user/executive-request).
// Name and contact come from the member's profile; the payment proof is uploaded to Cloudinary first.
export default function ExecutiveRequestScreen() {
  const t = useT();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [declared, setDeclared] = useState(false);
  const [application, setApplication] = useState<ApiExecutiveApplication | null>(null);
  const [minDonation, setMinDonation] = useState(MIN_EXECUTIVE_DONATION);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The admin may approve or reject at any time: the status is read again each time the screen is opened,
  // and on pull-to-refresh
  const load = useCallback(
    () =>
      getExecutiveRequest()
        .then(({ data }) => {
          setApplication(data.application);
          setMinDonation(data.executive_min_donation);
        })
        .catch(() => {}),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );
  const refresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  const status: RequestStatus = application ? STATUS_LABEL[application.status] : 'Not submitted';
  // A new request can be sent when there is none yet, or the last one was rejected
  const canApply = !application || application.status === 'rejected';
  const amountValue = Number(amount);

  const canSubmit =
    amountValue >= minDonation &&
    [reference, reason].every((v) => v.trim().length > 0) &&
    !!file &&
    declared &&
    !submitting;

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_UPLOAD_BYTES) {
      setFileError(t('File must be smaller than 5MB.'));
      return;
    }
    setFileError(null);
    setFile({ name: asset.name, uri: asset.uri, size: asset.size, mimeType: asset.mimeType });
  };

  const onSubmit = async () => {
    if (!canSubmit || !file || !user) return;
    setSubmitting(true);
    setErrors({});
    try {
      // Photos are compressed on the way; a PDF is sent as it is
      const uploaded = await uploadMedia(
        { uri: file.uri, kind: 'image', mimeType: file.mimeType, fileSize: file.size },
        mediaFolder('proof', user.id),
      );
      const { data, message } = await createExecutiveRequest({
        donation_amount: amountValue,
        reference_no: reference.trim(),
        reason: reason.trim(),
        payment_proof_url: uploaded.url,
      });
      setApplication(data.application);
      Alert.alert(t('Request Submitted'), message);
    } catch (e) {
      const fieldErrors = (e as { fieldErrors?: Record<string, string> }).fieldErrors ?? {};
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) Alert.alert(t('Could not submit'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={common.screen}>
        <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoid>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          <Text style={common.heading}>{t('Executive Membership Request')}</Text>
          <Text style={common.subtextRelaxed}>
            {t('Apply for executive membership and be a part of your society\'s leadership team.')}
          </Text>

          <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
            <View style={styles.bannerIcon}>
              <MaterialCommunityIcons name="crown-outline" size={24} color={colors.white} />
            </View>
            <View style={common.flex}>
              <Text style={styles.bannerTitle}>{t('Become an Executive Member')}</Text>
              <Text style={styles.bannerText}>
                {t("Executive membership access is granted only after a minimum donation of {amount} and approval from the admin team. This helps us maintain transparency and ensure active participation in the society's decision-making process.", { amount: formatINR(minDonation) })}
              </Text>
            </View>
          </LinearGradient>

          {application ? (
            <View style={styles.current}>
              <View style={styles.status}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                <Text style={styles.statusLabel}>{t('Request sent on {date}', { date: formatDate(new Date(application.created_at)) })}</Text>
                <Pill label={status} tone={statusStyle[status]} />
              </View>
              <Text style={styles.currentText}>
                {`${t('Donation')} ${formatINR(application.donation_amount)} · ${t('Reference')} ${application.reference_no ?? '-'}`}
              </Text>
              {application.review_note ? <Text style={styles.currentText}>{`${t('Admin note')}: ${application.review_note}`}</Text> : null}
              {application.status === 'pending' ? (
                <Text style={styles.currentText}>{t('The admin team will review your request. You\'ll get a notification when it\'s decided.')}</Text>
              ) : null}
            </View>
          ) : null}

          {canApply ? (
            <>
          <Text style={styles.formTitle}>{application ? 'Apply Again' : 'Application Form'}</Text>

          <FormField label="Member Name">
            <InputField value={user?.name ?? ''} editable={false} />
          </FormField>

          <FormField label="Contact Number">
            <InputField value={user?.mobile ? `${user.countryCode ?? ''} ${user.mobile}`.trim() : ''} editable={false} />
          </FormField>

          <View style={styles.row}>
            <FormField label="Donation Amount" style={common.flex} error={errors.donation_amount}>
              <InputField
                placeholder={t('At least {amount}', { amount: formatINR(minDonation) })}
                value={amount}
                onChangeText={(text) => setAmount(digitsOnly(text).slice(0, 7))}
                keyboardType="number-pad"
                error={!!errors.donation_amount}
              />
            </FormField>
            <FormField label="Donation Reference" style={common.flex} error={errors.reference_no}>
              <InputField
                placeholder="UPI Ref No. / Receipt No."
                value={reference}
                onChangeText={setReference}
                autoCapitalize="characters"
                maxLength={64}
              />
            </FormField>
          </View>
          {amount && amountValue < minDonation ? (
            <Text style={styles.hint}>{t('The minimum donation for executive membership is {amount}.', { amount: formatINR(minDonation) })}</Text>
          ) : null}

          <FormField label="Reason for Executive Membership" error={errors.reason}>
            <InputField
              placeholder="Write a brief reason for your application..."
              value={reason}
              onChangeText={setReason}
              maxLength={1000}
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
                <Text style={styles.uploadText}>{t('Choose file or drag and drop')}</Text>
                <Text style={styles.uploadHint}>{t('PDF, JPG, PNG (Max 5MB)')}</Text>
              </Pressable>
            )}
          </FormField>

          <Checkbox
            checked={declared}
            onChange={setDeclared}
            style={styles.declare}
            label={
              <Text style={styles.declareText}>
                {t('I hereby declare that the information provided above is true and correct.')}
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
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}

const styles = themedStyles(() => ({
  scroll: { padding: 16, paddingBottom: 32 },
  loading: { marginTop: 40 },
  current: { marginTop: 16, gap: 8 },
  currentText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.warning, marginTop: -6, marginBottom: 8 },

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
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statusLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
}));
