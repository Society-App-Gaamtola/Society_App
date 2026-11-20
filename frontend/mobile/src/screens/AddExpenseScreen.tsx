import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { MAX_UPLOAD_BYTES } from '../config';
import { getExpense, getExpenses, saveExpense, type ApiExpense, type ApiExpenseStatus } from '../api/executive';
import { useAuth } from '../context/AuthContext';
import { mediaFolder, uploadMedia } from '../services/media';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import { formatDate, fromIsoDay, toIsoDay } from '../utils/date';
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
  UploadBox,
} from '../components';
import DatePickerSheet from '../components/sheets/DatePickerSheet';
import { thisMonth } from './ExportReportsScreen';
import { useT } from '../i18n';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AddExpense'>;
type Field = 'description' | 'paidTo' | 'category' | 'amount' | 'bill';
/** A file picked on the phone (uploaded when saved) or the bill already saved (a link) */
type Bill = { name: string; uri: string; mimeType?: string; size?: number };

const MODES: { mode: ApiExpense['mode']; label: string }[] = [
  { mode: 'cash', label: 'Cash' },
  { mode: 'upi', label: 'UPI' },
  { mode: 'bank', label: 'Bank' },
  { mode: 'cheque', label: 'Cheque' },
];

/** Add or edit a society expense (POST / PUT /admin/expenses: the Expenses section) */
export default function AddExpenseScreen() {
  return (
    <PermissionGate permission="expenses">
      <AddExpenseForm />
    </PermissionGate>
  );
}

function AddExpenseForm() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'AddExpense'>>();
  const { user } = useAuth();
  const editId = params?.expenseId;

  const [categories, setCategories] = useState<string[]>(params?.categories ?? []);
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<ApiExpense['mode']>('cash');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date());
  const [bill, setBill] = useState<Bill | null>(null);
  const [status, setStatus] = useState<ApiExpenseStatus>('pending');
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [iosDate, setIosDate] = useState<Date | null>(null);
  const { errors, setErrors, clearError, setError, fieldProps } = useFormErrors<Field>();

  // The society's categories come with the expenses list; opened on its own, ask for them
  useEffect(() => {
    if (categories.length) return;
    const range = thisMonth();
    getExpenses(1, { from_date: range.start, to_date: range.end })
      .then(({ data }) => setCategories(data.expense_categories ?? []))
      .catch(() => {});
  }, [categories.length]);

  // Editing: the saved expense fills the form
  useEffect(() => {
    if (!editId) return;
    getExpense(editId)
      .then(({ data: { expense: e } }) => {
        setDescription(e.description);
        setPaidTo(e.paid_to);
        setCategory(e.category);
        setAmount(String(e.amount));
        setMode(e.mode);
        setReference(e.reference_no ?? '');
        setDate(fromIsoDay(e.txn_date));
        setBill(e.bill_url ? { name: t('Saved bill'), uri: e.bill_url } : null);
        setStatus(e.status);
      })
      .catch((e) => Alert.alert(t('Could not load the expense'), e instanceof Error ? e.message : t('Please try again.')))
      .finally(() => setLoading(false));
  }, [editId, t]);

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ mode: 'date', value: date, maximumDate: new Date(), onChange: (e, d) => e.type === 'set' && d && setDate(d) });
    } else {
      setIosDate(date);
    }
  };

  const pickBill = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_UPLOAD_BYTES) {
      setError('bill', 'File must be smaller than 5 MB.');
      return;
    }
    clearError('bill');
    setBill({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType, size: asset.size });
  };

  const parsedAmount = Number(amount.replace(/,/g, ''));

  // New expenses wait for verification; "Save & Verify" counts them at once (only verified expenses count in totals)
  const save = async (nextStatus: ApiExpenseStatus) => {
    const next: typeof errors = {};
    if (!description.trim()) next.description = 'Please enter what the money was spent on.';
    if (!paidTo.trim()) next.paidTo = 'Please enter who was paid.';
    if (!category) next.category = 'Select a category.';
    if (!amount.trim()) next.amount = 'Please enter the amount.';
    else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) next.amount = 'Amount must be greater than 0.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      let billUrl: string | null = null;
      if (bill) {
        billUrl = /^https?:\/\//.test(bill.uri)
          ? bill.uri
          : (await uploadMedia({ uri: bill.uri, kind: 'image', mimeType: bill.mimeType, fileSize: bill.size }, mediaFolder('finance', user?.id))).url;
      }
      const { message } = await saveExpense(
        {
          description: description.trim(),
          paid_to: paidTo.trim(),
          category: category!,
          amount: parsedAmount,
          mode,
          reference_no: reference.trim() || undefined,
          txn_date: toIsoDay(date),
          status: nextStatus,
          bill_url: billUrl,
        },
        editId,
      );
      showToast(message);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('Could not save the expense'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <Text style={common.heading}>{t(editId ? 'Edit Expense' : 'Add Expense')}</Text>
          <Text style={styles.subtext}>{t('Only verified expenses count in the totals.')}</Text>

          <FormField label="Description" error={errors.description}>
            <InputField placeholder="e.g. Flowers for Navratri" value={description} maxLength={256} {...fieldProps('description', setDescription)} />
          </FormField>

          <FormField label="Paid To" error={errors.paidTo}>
            <InputField placeholder="e.g. Shree Flower Shop" value={paidTo} maxLength={128} autoCapitalize="words" {...fieldProps('paidTo', setPaidTo)} />
          </FormField>

          <View style={styles.row}>
            <FormField label="Amount" error={errors.amount} style={common.flex}>
              <InputField
                placeholder="₹ 0"
                value={amount}
                keyboardType="decimal-pad"
                {...fieldProps('amount', (v) => setAmount(v.replace(/[^\d.]/g, '')))}
              />
            </FormField>
            <FormField label="Date" style={common.flex}>
              <PickerField icon="calendar-outline" value={formatDate(date)} onPress={pickDate} />
            </FormField>
          </View>

          <FormField label="Category" error={errors.category}>
            <PickerField
              placeholder="Select category"
              trailingIcon="chevron-down"
              value={category}
              error={!!errors.category}
              onPress={() => setCategorySheet(true)}
            />
          </FormField>

          <FormField label="Payment Mode">
            <View style={styles.chips}>
              {MODES.map((m) => {
                const active = m.mode === mode;
                return (
                  <Pressable
                    key={m.mode}
                    onPress={() => setMode(m.mode)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(m.label)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </FormField>

          <FormField label="Reference No." required={false}>
            <InputField placeholder="Bill / UTR / cheque number" value={reference} maxLength={64} autoCapitalize="characters" onChangeText={setReference} />
          </FormField>

          <FormField label="Bill" required={false} error={errors.bill}>
            {bill ? (
              <View style={styles.fileRow}>
                {bill.mimeType?.startsWith('image/') ? (
                  <Image source={{ uri: bill.uri }} style={styles.thumb} />
                ) : (
                  <IconCircle size={40} radius={8}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  </IconCircle>
                )}
                <Text style={styles.fileName} numberOfLines={1}>
                  {bill.name}
                </Text>
                <Pressable onPress={() => setBill(null)} hitSlop={10} accessibilityLabel={t('Remove')}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <UploadBox title="Tap to upload the bill" hint="JPG, PNG or PDF up to 5 MB" error={!!errors.bill} onPress={pickBill} />
            )}
          </FormField>
        </ScrollView>

        <FormActionBar
          draftTitle="Save & Verify"
          draftIcon="checkmark-circle-outline"
          onSaveDraft={() => save('verified')}
          primaryTitle={editId ? 'Save' : 'Submit'}
          onPrimary={() => save(editId ? status : 'pending')}
          busy={saving}
        />
      </KeyboardAvoid>

      <SelectSheet
        visible={categorySheet}
        title="Category"
        options={categories}
        selected={category}
        onSelect={(c) => {
          setCategory(c);
          clearError('category');
        }}
        onClose={() => setCategorySheet(false)}
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
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  chipTextActive: { color: colors.white },
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
