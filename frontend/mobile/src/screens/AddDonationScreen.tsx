import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts } from '../theme';
import { MAX_UPLOAD_BYTES } from '../config';
import { useDonations } from '../context/DonationsContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import type { Donation, DonationPurpose, NewDonation, PaymentMode } from '../types';
import { formatDate } from '../utils/date';
import { showToast } from '../utils/toast';
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
type Receipt = NonNullable<Donation['receipt']>;

const PAYMENT_METHODS: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
const PURPOSES: DonationPurpose[] = ['Festival', 'Aarti', 'Cultural', 'General Fund', 'Other'];
const MAX_NOTES = 300;

/** Keeps the chosen day but uses the current time, so entries sort sensibly. */
const withCurrentTime = (day: Date) => {
  const now = new Date();
  const d = new Date(day);
  d.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return d;
};

export default function AddDonationScreen() {
  return (
    <PermissionGate permission="donations">
      <AddDonationForm />
    </PermissionGate>
  );
}

function AddDonationForm() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'AddDonation'>>();
  const { donations, addDonation, updateDonation } = useDonations();
  const existing = params?.donationId ? donations.find((d) => d.id === params.donationId) : undefined;

  const [donorName, setDonorName] = useState(existing?.donorName ?? '');
  const [memberId, setMemberId] = useState(existing?.memberId ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [mode, setMode] = useState<PaymentMode | null>(existing?.mode ?? null);
  const [reference, setReference] = useState(existing?.reference ?? '');
  const [date, setDate] = useState<Date>(existing ? new Date(existing.date) : new Date());
  const [purpose, setPurpose] = useState<DonationPurpose | null>(existing?.purpose ?? null);
  const [notes, setNotes] = useState(existing?.note ?? '');
  const [receipt, setReceipt] = useState<Receipt | null>(existing?.receipt ?? null);
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
            setDate(withCurrentTime(picked));
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
    setReceipt({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType });
  };

  const parsedAmount = Number(amount.replace(/,/g, ''));

  const build = (status: NewDonation['status']): NewDonation => ({
    donorName: donorName.trim(),
    memberId: memberId.trim().toUpperCase(),
    amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
    mode: mode ?? 'Cash',
    reference: reference.trim(),
    date: date.toISOString(),
    purpose: purpose ?? undefined,
    note: notes.trim() || undefined,
    receipt: receipt ?? undefined,
    status,
  });

  const save = (status: NewDonation['status']) => {
    const entry = build(status);
    if (existing) updateDonation(existing.id, entry);
    else addDonation(entry);
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!donorName.trim()) next.donorName = 'Please enter the donor name.';
    if (!memberId.trim()) next.memberId = 'Please enter the member ID.';
    if (!amount.trim()) next.amount = 'Please enter the amount.';
    else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) next.amount = 'Amount must be greater than 0.';
    if (!mode) next.mode = 'Please select a payment method.';
    if (!reference.trim()) next.reference = 'Please enter the transaction ID or receipt number.';
    if (!purpose) next.purpose = 'Select a purpose.';
    if (!receipt) next.receipt = 'Please upload the receipt.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSaveDraft = () => {
    if (!donorName.trim()) {
      setError('donorName', 'Add the donor name to save a draft.');
      return;
    }
    save('Draft');
    showToast('Draft saved');
    navigation.goBack();
  };

  const onSubmit = () => {
    if (!validate()) {
      showToast('Please fill all required fields');
      return;
    }
    // Every submitted entry waits for verification (cash and bank entries are checked by the treasurer).
    save('Pending');
    showToast('Donation entry submitted');
    navigation.goBack();
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>{existing ? 'Edit Donation Entry' : 'Add Donation Entry'}</Text>
          <Text style={styles.subtext}>Fill in the donation details below.</Text>

          <FormField label="Donor Name" error={errors.donorName}>
            <InputField
              placeholder="e.g. Dhaval Patel"
              value={donorName}
              {...fieldProps('donorName', setDonorName)}
              autoCapitalize="words"
            />
          </FormField>

          <FormField label="Member ID" error={errors.memberId}>
            <InputField
              placeholder="e.g. GM001 (if member)"
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

          <FormField label="Transaction ID / Receipt No." error={errors.reference}>
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

          <FormField label="Upload Receipt" error={errors.receipt}>
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

        <FormActionBar onSaveDraft={onSaveDraft} primaryTitle="Submit Entry" onPrimary={onSubmit} />
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
        options={PURPOSES}
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
            setDate(withCurrentTime(iosDate));
            setIosDate(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24 },
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
});
