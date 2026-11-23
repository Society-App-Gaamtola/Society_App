import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { MAX_UPLOAD_BYTES } from '../config';
import { getDonationEntry, METHOD_OF, saveDonationEntry, toDonation, type ApiEntryStatus } from '../api/executive';
import { useAuth } from '../context/AuthContext';
import { useDonationSettings } from '../hooks/useDonationSettings';
import { mediaFolder, uploadMedia } from '../services/media';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import type { PaymentMode } from '../types';
import { formatDate, fromIsoDay, toIsoDay } from '../utils/date';
import { showToast } from '../utils/toast';
import { useT } from '../i18n';
import {
  AppHeader,
  FormActionBar,
  FormField,
  IconCircle,
  InputField,
  KeyboardAvoid,
  PermissionGate,
  PickerField,
  SelectSheet,
  TextAreaField,
  UploadBox,
} from '../components';
import DatePickerSheet from '../components/sheets/DatePickerSheet';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AddDonation'>;
type Field = 'donorName' | 'memberId' | 'amount' | 'mode' | 'reference' | 'date' | 'purpose' | 'receipt';
/** A file picked on the phone (uploaded when saved) or the proof already saved (a link) */
type Receipt = { name: string; uri: string; mimeType?: string; size?: number };

const PAYMENT_METHODS: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
// Until the society's list loads (App Settings → Donation Categories)
const FALLBACK_PURPOSES = ['General Fund', 'Festival', 'Aarti', 'Other'];
const MAX_NOTES = 256;

export default function AddDonationScreen() {
  return (
    <PermissionGate permission="donations">
      <AddDonationForm />
    </PermissionGate>
  );
}

function AddDonationForm() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'AddDonation'>>();
  const { user } = useAuth();
  const editId = params?.donationId;
  const purposes = useDonationSettings()?.purposes ?? FALLBACK_PURPOSES;

  const [donorName, setDonorName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PaymentMode | null>(null);
  const [reference, setReference] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [purpose, setPurpose] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [status, setStatus] = useState<ApiEntryStatus>('pending');
  const [loadingEntry, setLoadingEntry] = useState(!!editId);
  const [saving, setSaving] = useState(false);

  // Editing: the saved entry fills the form
  useEffect(() => {
    if (!editId) return;
    getDonationEntry(editId)
      .then(({ data }) => {
        const d = toDonation(data.donation);
        setDonorName(d.donorName);
        setMemberId(d.memberId === '-' ? '' : d.memberId);
        setAmount(String(d.amount));
        setMode(d.mode);
        setReference(d.reference ?? '');
        setDate(fromIsoDay(d.date));
        setPurpose(d.purpose ?? null);
        setNotes(d.note ?? '');
        setReceipt(d.proofUrl ? { name: 'Saved proof', uri: d.proofUrl } : null);
        setStatus(data.donation.status);
      })
      .catch((e) => Alert.alert(t('Could not load the entry'), e instanceof Error ? e.message : t('Please try again.')))
      .finally(() => setLoadingEntry(false));
  }, [editId]);
  const { errors, setErrors, clearError, setError, fieldProps } = useFormErrors<Field>();
  const [sheet, setSheet] = useState<'mode' | 'purpose' | null>(null);
  const [iosDate, setIosDate] = useState<Date | null>(null);
  const [amountFocused, setAmountFocused] = useState(false);

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: date,
        maximumDate: new Date(),
        onChange: (e, picked) => {
          if (e.type === 'set' && picked) {
            setDate(picked);
            clearError('date');
          }
        },
      });
    } else {
      setIosDate(date);
    }
  };

  const pickReceipt = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_UPLOAD_BYTES) {
      setError('receipt', 'File must be smaller than 5 MB.');
      return;
    }
    clearError('receipt');
    setReceipt({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType, size: asset.size });
  };

  const parsedAmount = Number(amount.replace(/,/g, ''));

  const validate = () => {
    const next: typeof errors = {};
    // A member is found by their code; anyone else is saved by name
    if (!donorName.trim() && !memberId.trim()) next.donorName = 'Enter the donor name or a member ID.';
    if (!amount.trim()) next.amount = 'Please enter the amount.';
    else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) next.amount = 'Amount must be greater than 0.';
    if (!mode) next.mode = 'Please select a payment method.';
    if (mode && mode !== 'Cash' && !reference.trim()) next.reference = 'Please enter the transaction ID or receipt number.';
    if (!purpose) next.purpose = 'Select a purpose.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // New entries wait for verification; "Save & Verify" counts them at once (only verified entries count in totals)
  const save = async (nextStatus: ApiEntryStatus) => {
    if (!validate()) {
      showToast(t('Please fill all required fields'));
      return;
    }
    setSaving(true);
    try {
      let proofUrl: string | null = null;
      if (receipt) {
        proofUrl = /^https?:\/\//.test(receipt.uri)
          ? receipt.uri
          : (await uploadMedia({ uri: receipt.uri, kind: 'image', mimeType: receipt.mimeType, fileSize: receipt.size }, mediaFolder('finance', user?.id))).url;
      }
      const code = memberId.trim().toUpperCase();
      const { message } = await saveDonationEntry(
        {
          ...(code ? { member_code: code } : { donor_name: donorName.trim() }),
          amount: parsedAmount,
          purpose: purpose!,
          method: METHOD_OF[mode!],
          reference_no: reference.trim() || undefined,
          donated_on: toIsoDay(date),
          status: nextStatus,
          proof_url: proofUrl,
          note: notes.trim() || undefined,
        },
        editId,
      );
      showToast(message);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('Could not save the entry'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadingEntry) {
    return (
      <View style={common.screen}>
        <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>{t(editId ? 'Edit Donation Entry' : 'Add Donation Entry')}</Text>
          <Text style={styles.subtext}>{t('Fill in the donation details below.')}</Text>

          <FormField label="Donor Name" required={!memberId.trim()} error={errors.donorName}>
            <InputField
              placeholder="e.g. Dhaval Patel"
              value={donorName}
              {...fieldProps('donorName', setDonorName)}
              autoCapitalize="words"
            />
          </FormField>

          <FormField label="Member ID (if member)" required={false} error={errors.memberId}>
            <InputField
              placeholder="e.g. GM0012"
              value={memberId}
              {...fieldProps('memberId', setMemberId)}
              autoCapitalize="characters"
            />
          </FormField>

          <FormField label="Donation Amount" error={errors.amount}>
            <View style={[styles.amountBox, amountFocused && styles.focused, errors.amount ? styles.amountError : undefined]}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^\d.]/g, ''));
                  clearError('amount');
                }}
                placeholder="Enter amount"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
              />
            </View>
          </FormField>

          <FormField label="Payment Method" error={errors.mode}>
            <PickerField
              placeholder="Select payment method"
              trailingIcon="chevron-down"
              value={mode}
              error={!!errors.mode}
              onPress={() => setSheet('mode')}
            />
          </FormField>

          <FormField label="Transaction ID / Receipt No." required={mode !== 'Cash'} error={errors.reference}>
            <InputField
              placeholder="e.g. UTR number / Receipt No."
              value={reference}
              {...fieldProps('reference', setReference)}
              autoCapitalize="characters"
            />
          </FormField>

          <View style={styles.row}>
            <FormField label="Date" error={errors.date} style={common.flex}>
              <PickerField icon="calendar-outline" value={formatDate(date)} onPress={openDatePicker} />
            </FormField>
            <FormField label="Purpose" error={errors.purpose} style={common.flex}>
              <PickerField
                placeholder="Select purpose"
                trailingIcon="chevron-down"
                value={purpose}
                error={!!errors.purpose}
                onPress={() => setSheet('purpose')}
              />
            </FormField>
          </View>

          <FormField label="Notes (Optional)" required={false}>
            <TextAreaField
              placeholder="Add any additional notes about this donation..."
              maxLength={MAX_NOTES}
              minHeight={80}
              value={notes}
              onChangeText={setNotes}
            />
          </FormField>

          <FormField label="Upload Receipt / Proof" required={false} error={errors.receipt}>
            {receipt ? (
              <View style={styles.fileRow}>
                {receipt.mimeType?.startsWith('image/') ? (
                  <Image source={{ uri: receipt.uri }} style={styles.thumb} />
                ) : (
                  <IconCircle size={40} radius={8}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  </IconCircle>
                )}
                <Text style={styles.fileName} numberOfLines={1}>
                  {receipt.name}
                </Text>
                <Pressable onPress={() => setReceipt(null)} hitSlop={10} accessibilityLabel="Remove receipt">
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <UploadBox title="Tap to upload receipt" hint="JPG, PNG or PDF up to 5 MB" error={!!errors.receipt} onPress={pickReceipt} />
            )}
          </FormField>
        </ScrollView>

        <FormActionBar
          draftTitle="Save & Verify"
          draftIcon="checkmark-circle-outline"
          onSaveDraft={() => save('success')}
          primaryTitle={editId ? 'Save Entry' : 'Submit Entry'}
          onPrimary={() => save(editId ? status : 'pending')}
          busy={saving}
        />
      </KeyboardAvoid>

      <SelectSheet
        visible={sheet === 'mode'}
        title="Payment Method"
        options={PAYMENT_METHODS}
        selected={mode}
        onSelect={(m) => {
          setMode(m);
          clearError('mode');
        }}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'purpose'}
        title="Purpose"
        options={purposes}
        selected={purpose}
        onSelect={(p) => {
          setPurpose(p);
          clearError('purpose');
        }}
        onClose={() => setSheet(null)}
      />

      {iosDate ? (
        <DatePickerSheet
          mode="date"
          value={iosDate}
          maximumDate={new Date()}
          onChange={setIosDate}
          onCancel={() => setIosDate(null)}
          onDone={() => {
            setDate(iosDate);
            setIosDate(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  scroll: { padding: 16, paddingBottom: 24 },
  loading: { marginTop: 40 },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },

  amountBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  focused: { borderColor: colors.primary },
  amountError: { borderColor: colors.danger },
  rupee: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textDark },
  amountInput: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 14, color: colors.textDark, padding: 0 },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  fileName: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },
}));
