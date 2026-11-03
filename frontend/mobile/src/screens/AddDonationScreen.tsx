import { useState, type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import {
  useDonations,
  type Donation,
  type DonationPurpose,
  type NewDonation,
  type PaymentMode,
} from '../donations/DonationsContext';
import { formatDate } from '../utils/date';
import { showToast } from '../utils/toast';
import { AppHeader, InputField, OutlineButton, PermissionGate, PrimaryButton, SelectSheet } from '../components';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AddDonation'>;
type Field = 'donorName' | 'memberId' | 'amount' | 'mode' | 'reference' | 'date' | 'purpose' | 'receipt';
type Errors = Partial<Record<Field, string>>;
type Receipt = NonNullable<Donation['receipt']>;

const PAYMENT_METHODS: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
const PURPOSES: DonationPurpose[] = ['Festival', 'Aarti', 'Cultural', 'General Fund', 'Other'];
const MAX_NOTES = 300;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ERROR = '#C62828';
const MUTED_ICON = '#9A8F86';
const PLACEHOLDER = '#A89E94';

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
  const [errors, setErrors] = useState<Errors>({});
  const [sheet, setSheet] = useState<'mode' | 'purpose' | null>(null);
  const [iosDate, setIosDate] = useState<Date | null>(null);
  const [amountFocused, setAmountFocused] = useState(false);

  const clear = (field: Field) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: date,
        maximumDate: new Date(),
        onChange: (e, picked) => {
          if (e.type === 'set' && picked) {
            setDate(withCurrentTime(picked));
            clear('date');
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
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      setErrors((e) => ({ ...e, receipt: 'File must be smaller than 5 MB.' }));
      return;
    }
    clear('receipt');
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
    const next: Errors = {};
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
      setErrors((e) => ({ ...e, donorName: 'Add the donor name to save a draft.' }));
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
    <View style={styles.container}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>{existing ? 'Edit Donation Entry' : 'Add Donation Entry'}</Text>
          <Text style={styles.subtext}>Fill in the donation details below.</Text>

          <FormField label="Donor Name" error={errors.donorName}>
            <InputField
              placeholder="e.g. Dhaval Patel"
              value={donorName}
              onChangeText={(v) => {
                setDonorName(v);
                clear('donorName');
              }}
              autoCapitalize="words"
              containerStyle={errors.donorName ? styles.inputError : undefined}
            />
          </FormField>

          <FormField label="Member ID" error={errors.memberId}>
            <InputField
              placeholder="e.g. GM001 (if member)"
              value={memberId}
              onChangeText={(v) => {
                setMemberId(v);
                clear('memberId');
              }}
              autoCapitalize="characters"
              containerStyle={errors.memberId ? styles.inputError : undefined}
            />
          </FormField>

          <FormField label="Donation Amount" error={errors.amount}>
            <View style={[styles.amountBox, amountFocused && styles.focused, errors.amount ? styles.inputError : undefined]}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={(v) => {
                  setAmount(v.replace(/[^\d.]/g, ''));
                  clear('amount');
                }}
                placeholder="Enter amount"
                placeholderTextColor={PLACEHOLDER}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
              />
            </View>
          </FormField>

          <FormField label="Payment Method" error={errors.mode}>
            <DropdownField
              placeholder="Select payment method"
              value={mode}
              error={!!errors.mode}
              onPress={() => setSheet('mode')}
            />
          </FormField>

          <FormField label="Transaction ID / Receipt No." error={errors.reference}>
            <InputField
              placeholder="e.g. UTR number / Receipt No."
              value={reference}
              onChangeText={(v) => {
                setReference(v);
                clear('reference');
              }}
              autoCapitalize="characters"
              containerStyle={errors.reference ? styles.inputError : undefined}
            />
          </FormField>

          <View style={styles.row}>
            <FormField label="Date" error={errors.date} style={styles.flex}>
              <Pressable style={styles.picker} onPress={openDatePicker} accessibilityRole="button">
                <Ionicons name="calendar-outline" size={18} color={MUTED_ICON} />
                <Text style={styles.pickerText} numberOfLines={1}>
                  {formatDate(date)}
                </Text>
              </Pressable>
            </FormField>
            <FormField label="Purpose" error={errors.purpose} style={styles.flex}>
              <DropdownField
                placeholder="Select purpose"
                value={purpose}
                error={!!errors.purpose}
                onPress={() => setSheet('purpose')}
              />
            </FormField>
          </View>

          <FormField label="Notes (Optional)" required={false}>
            <View>
              <InputField
                placeholder="Add any additional notes about this donation..."
                multiline
                maxLength={MAX_NOTES}
                value={notes}
                onChangeText={setNotes}
                containerStyle={styles.notes}
                style={styles.notesInput}
              />
              <Text style={styles.counter}>
                {notes.length}/{MAX_NOTES}
              </Text>
            </View>
          </FormField>

          <FormField label="Upload Receipt" error={errors.receipt}>
            {receipt ? (
              <View style={styles.fileRow}>
                {receipt.mimeType?.startsWith('image/') ? (
                  <Image source={{ uri: receipt.uri }} style={styles.thumb} />
                ) : (
                  <View style={styles.fileIcon}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.fileName} numberOfLines={1}>
                  {receipt.name}
                </Text>
                <Pressable onPress={() => setReceipt(null)} hitSlop={10} accessibilityLabel="Remove receipt">
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.upload, errors.receipt ? styles.inputError : undefined]}
                onPress={pickReceipt}
                accessibilityRole="button"
              >
                <View style={styles.fileIcon}>
                  <Ionicons name="image-outline" size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.uploadTitle}>Tap to upload receipt</Text>
                  <Text style={styles.uploadHint}>JPG, PNG or PDF up to 5 MB</Text>
                </View>
              </Pressable>
            )}
          </FormField>
        </ScrollView>

        <View style={styles.bottomBar}>
          <OutlineButton title="Save Draft" icon="save-outline" onPress={onSaveDraft} style={styles.barButton} />
          <PrimaryButton title="Submit Entry" onPress={onSubmit} style={styles.barButton} />
        </View>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={sheet === 'mode'}
        title="Payment Method"
        options={PAYMENT_METHODS}
        selected={mode}
        onSelect={(m) => {
          setMode(m);
          clear('mode');
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
          clear('purpose');
        }}
        onClose={() => setSheet(null)}
      />

      {iosDate ? (
        <Modal transparent animationType="slide" onRequestClose={() => setIosDate(null)}>
          <Pressable style={styles.backdrop} onPress={() => setIosDate(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setIosDate(null)} hitSlop={8}>
                <Text style={styles.sheetCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDate(withCurrentTime(iosDate));
                  setIosDate(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.sheetDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={iosDate}
              maximumDate={new Date()}
              onChange={(_, d) => d && setIosDate(d)}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function FormField({
  label,
  error,
  required = true,
  style,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  style?: object;
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function DropdownField({
  placeholder,
  value,
  error,
  onPress,
}: {
  placeholder: string;
  value: string | null;
  error?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.picker, error && styles.inputError]} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.pickerText, !value && styles.placeholder]} numberOfLines={1}>
        {value ?? placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={MUTED_ICON} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 16 },

  field: { marginBottom: 14 },
  label: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark, marginBottom: 6 },
  required: { color: ERROR },
  error: { fontFamily: fonts.regular, fontSize: 11, color: ERROR, marginTop: 4 },
  inputError: { borderColor: ERROR },
  focused: { borderColor: colors.primary },
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
  rupee: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.textDark },
  amountInput: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 14, color: colors.textDark, padding: 0 },

  picker: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pickerText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },
  placeholder: { color: PLACEHOLDER },

  notes: { minHeight: 80 },
  notesInput: { minHeight: 56, paddingBottom: 14 },
  counter: { position: 'absolute', right: 10, bottom: 6, fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  upload: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D9CBB8',
    backgroundColor: colors.card,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark },
  uploadHint: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
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

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barButton: { flex: 1, width: 'auto' },

  backdrop: { flex: 1, backgroundColor: 'rgba(43, 26, 18, 0.35)' },
  sheet: { backgroundColor: colors.white, paddingBottom: 24 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetCancel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  sheetDone: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
});
