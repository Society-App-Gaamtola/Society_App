import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import type { DonateStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, themedStyles } from '../theme';
import { DONATION_PRESETS, MEDIA, MIN_EXECUTIVE_DONATION } from '../config';
import { useAuth } from '../context/AuthContext';
import { useDonationSettings } from '../hooks/useDonationSettings';
import { createDonation, DONATION_PURPOSE_ICON, METHOD_TO_API, submitDonationPayment, toMyDonation } from '../api/member';
import { isUtr, upiDonationNote, upiPayUrl } from '../services/upi';
import { mediaFolder, uploadMedia } from '../services/media';
import { receiptNo } from '../services/receipt';
import { Ionicons, MaterialCommunityIcons, type IoniconName } from '../icons';
import type { DonationMethod, DonationPurpose, MyDonation } from '../types';
import { formatDateTime } from '../utils/date';
import { formatINR } from '../utils/format';
import { digitsOnly } from '../utils/validation';
import { AppHeader, FieldLabel, FilterChips, IconCircle, InputField, OutlineButton, Pill, PrimaryButton, StepIndicator } from '../components';
import PaymentMethodList from '../components/donate/PaymentMethodList';
import UpiQrCard from '../components/donate/UpiQrCard';
import { useT } from '../i18n';

type Step = 'amount' | 'pay' | 'done';
const STEPS = ['Amount', 'Payment', 'Receipt'];
const STEP_NUMBER: Record<Step, number> = { amount: 1, pay: 2, done: 3 };

const PURPOSES: DonationPurpose[] = ['Festival', 'Aarti', 'Cultural', 'General Fund', 'Other'];
const PURPOSE_ICON = DONATION_PURPOSE_ICON;

/** Methods paid outside the app, confirmed by entering the UPI transaction ID. */
const UPI_WAYS: DonationMethod[] = ['UPI App', 'QR Code'];

/** The UPI donation saved before paying: its id (receipt number DON042) goes in the UPI note */
type UpiDraft = { id: number; amount: number; purpose: string };
type Screenshot = { uri: string; mimeType?: string; fileSize?: number };

/** raw: the text is shown as it is (a server message, or the note the admin typed), not looked up with t() */
function InfoBox({ icon, text, raw }: { icon: IoniconName; text: string; raw?: boolean }) {
  const t = useT();
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.infoText}>{raw ? text : t(text)}</Text>
    </View>
  );
}

/** UPI safety notice and the donor's declaration, shown with the UPI methods (client review: RFP item) */
const UPI_SAFETY_TIPS = [
  'Pay only to the society UPI ID shown here, and check the payee name before you pay.',
  'Never share your UPI PIN or OTP with anyone. The society will never ask for it.',
  'You never need your UPI PIN to receive money. Ignore calls or messages that ask for it.',
  'Enter the UTR only after your payment app shows the payment as successful.',
];

function UpiSafetyNotice({ upiId }: { upiId?: string }) {
  const t = useT();
  return (
    <View style={styles.safety} accessibilityRole="summary">
      <View style={styles.safetyHeader}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <Text style={styles.safetyTitle}>{t('Pay safely with UPI')}</Text>
      </View>
      {upiId ? <Text style={styles.safetyLine}>{t('Society UPI ID: {id}', { id: upiId })}</Text> : null}
      {UPI_SAFETY_TIPS.map((tip) => (
        <Text key={tip} style={styles.safetyLine}>
          • {t(tip)}
        </Text>
      ))}
      <Text style={styles.declaration}>
        {t("By submitting, you confirm that this is a voluntary donation from your own funds for the society's activities.")}
      </Text>
    </View>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  const t = useT();
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{t(label)}</Text>
      <Text style={styles.receiptValue}>{value}</Text>
    </View>
  );
}

// Guided donation: choose purpose and amount → choose how to pay → receipt. Pay by UPI (UPI app or QR code) or cash.
// UPI: the donation is saved first ("pending", POST /user/donations) so its receipt number (DON042) goes in the UPI
// note and shows on the society's bank statement. The QR / UPI link is built here from the society's UPI ID (App
// Settings in the panel) with the chosen amount. After paying, the donor sends the 12-digit UTR and, if they want, a
// screenshot (PUT /user/donations/:id/payment). The treasurer matches it with the bank statement and verifies it; the
// donor is then notified and the receipt appears in My Donations.
export default function DonateScreen() {
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<DonateStackParamList>>();
  const route = useRoute<RouteProp<DonateStackParamList, 'DonateMain'>>();
  const { user } = useAuth();
  const settings = useDonationSettings();
  const upi = settings?.upi ?? null;
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [step, setStep] = useState<Step>('amount');
  const [purpose, setPurpose] = useState<DonationPurpose>('Festival');
  const [preset, setPreset] = useState<number | null>(DONATION_PRESETS[1]);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState<DonationMethod>('QR Code');
  const [draft, setDraft] = useState<UpiDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [utrError, setUtrError] = useState('');
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [receipt, setReceipt] = useState<MyDonation | null>(null);

  const amount = custom ? Number(custom) : (preset ?? 0);
  const isUpi = UPI_WAYS.includes(method);
  // The saved donation still matches what is on screen (the donor may have gone back and changed the amount)
  const draftReady = !!draft && draft.amount === amount && draft.purpose === purpose;
  const donationNo = draftReady ? receiptNo(String(draft.id)) : undefined;
  const payUrl = donationNo ? upiPayUrl(upi, amount, upiDonationNote(donationNo)) : null;

  const goTo = (next: Step) => {
    setStep(next);
    setCreateError(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // My Donations → Finish Payment: back to the payment step of that unpaid UPI donation
  const resume = route.params?.resume;
  useEffect(() => {
    if (!resume) return;
    setPurpose(resume.purpose as DonationPurpose);
    setPreset(null);
    setCustom(String(resume.amount));
    setMethod(resume.method);
    setDraft({ id: resume.id, amount: resume.amount, purpose: resume.purpose });
    setUtr('');
    setUtrError('');
    setScreenshot(null);
    goTo('pay');
    navigation.setParams({ resume: undefined });
  }, [resume]);

  // UPI chosen on the payment step: save the donation once, to get its ID for the QR / UPI link
  const startUpiDonation = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const { data } = await createDonation({ amount, purpose, method: METHOD_TO_API[method] });
      setDraft({ id: data.donation.id, amount, purpose });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setCreating(false);
    }
  };
  useEffect(() => {
    if (step === 'pay' && isUpi && upi && !draftReady && !creating && !createError) startUpiDonation();
  }, [step, isUpi, upi, draftReady, creating, createError]);

  const showReceipt = (donation: MyDonation) => {
    setReceipt(donation);
    setDraft(null);
    goTo('done');
  };

  // Cash: paid at the office later, saved now as pending
  const recordCash = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { data } = await createDonation({ amount, purpose, method: 'cash' });
      showReceipt(toMyDonation(data.donation));
    } catch (e) {
      Alert.alert(t('Could not save the donation'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const openUpiApp = async () => {
    if (!payUrl) {
      return Alert.alert(t('UPI not set up yet'), t("Online UPI payments will start once the admin adds the society's UPI ID."));
    }
    try {
      await Linking.openURL(payUrl);
    } catch {
      Alert.alert(t('No UPI app found'), t('Please install a UPI app such as Google Pay, PhonePe or Paytm.'));
    }
  };

  const pickScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MEDIA.maxBytes.image) {
      return Alert.alert(t('File too large'), t('Image must be smaller than 10MB.'));
    }
    setScreenshot({ uri: asset.uri, mimeType: asset.mimeType, fileSize: asset.fileSize });
  };

  // After paying: the UTR (+ the screenshot, uploaded to Cloudinary proofs/user_<id>/ first) goes to the treasurer
  const submitUtr = async () => {
    if (!isUtr(utr)) return setUtrError(t('Enter the 12-digit UPI transaction ID (UTR) from your payment app.'));
    if (!draft || !user || saving) return;
    setSaving(true);
    try {
      const proofUrl = screenshot
        ? (await uploadMedia({ uri: screenshot.uri, kind: 'image', mimeType: screenshot.mimeType, fileSize: screenshot.fileSize }, mediaFolder('proof', user.id))).url
        : undefined;
      const { data } = await submitDonationPayment(draft.id, {
        reference_no: utr.trim(),
        method: method === 'UPI App' ? 'upi_app' : 'upi_qr',
        proof_url: proofUrl,
      });
      setUtr('');
      setScreenshot(null);
      showReceipt(toMyDonation(data.donation));
    } catch (e) {
      // A UTR problem belongs next to the UTR box
      setUtrError(e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const startAgain = () => {
    setUtr('');
    setUtrError('');
    setScreenshot(null);
    setReceipt(null);
    goTo('amount');
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>{t('Donate')}</Text>
        <Text style={common.subtextRelaxed}>{t('Your support helps us organise festivals, aarti and cultural programmes.')}</Text>
        <StepIndicator steps={STEPS} current={STEP_NUMBER[step]} />

        {step === 'amount' ? (
          <>
            <View style={styles.banner}>
              <MaterialCommunityIcons name="hand-heart-outline" size={34} color={colors.white} />
              <View style={common.flex}>
                <Text style={styles.bannerTitle}>{t('Contribute to Society Activities')}</Text>
                <Text style={styles.bannerText}>{t('Every donation gets a receipt in My Donations.')}</Text>
              </View>
            </View>

            <FieldLabel text="Purpose" />
            <FilterChips options={PURPOSES} selected={purpose} onSelect={setPurpose} style={styles.chips} />

            <FieldLabel text="Amount" />
            <View style={styles.presets}>
              {DONATION_PRESETS.map((value) => {
                const active = !custom && preset === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setPreset(value);
                      setCustom('');
                    }}
                    style={[styles.preset, active && styles.presetActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>{formatINR(value)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <InputField
              icon="cash-outline"
              placeholder="Or enter another amount"
              value={custom}
              onChangeText={(text) => setCustom(digitsOnly(text).replace(/^0+/, '').slice(0, 7))}
              keyboardType="number-pad"
              containerStyle={styles.gapTop}
            />

            <PrimaryButton
              title={amount > 0 ? t('Continue with {amount}', { amount: formatINR(amount) }) : 'Choose an amount'}
              icon="arrow-forward"
              disabled={amount <= 0}
              onPress={() => goTo('pay')}
              style={styles.gapTopLarge}
            />
            <OutlineButton title="My Donations & Receipts" icon="receipt-outline" onPress={() => navigation.navigate('MyDonations')} style={styles.gapTop} />

            {user?.role === 'member' ? (
              <Pressable style={styles.note} onPress={() => navigation.navigate('ExecutiveRequest')} accessibilityRole="button">
                <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
                <Text style={styles.noteText}>
                  {t('Members who donate {amount} or more can apply to become an Executive.', { amount: formatINR(MIN_EXECUTIVE_DONATION) })}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
              </Pressable>
            ) : null}
          </>
        ) : null}

        {step === 'pay' ? (
          <>
            <View style={styles.summary}>
              <IconCircle size={44}>
                <MaterialCommunityIcons name={PURPOSE_ICON[purpose] ?? 'hand-heart'} size={22} color={colors.primary} />
              </IconCircle>
              <View style={common.flex}>
                <Text style={styles.summaryAmount}>{formatINR(amount)}</Text>
                <Text style={styles.summaryPurpose}>{donationNo && isUpi ? `${t(purpose)} · ${donationNo}` : t(purpose)}</Text>
              </View>
              <Pressable onPress={() => goTo('amount')} hitSlop={8} accessibilityRole="button">
                <Text style={styles.change}>{t('Change')}</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>{t('Choose payment method')}</Text>
            <PaymentMethodList
              selected={method}
              onSelect={(m) => {
                setMethod(m);
                setUtrError('');
              }}
            />

            <View style={styles.panel}>
              {isUpi && !upi ? (
                <>
                  {method === 'QR Code' ? <UpiQrCard amount={amount} url={null} upi={upi} /> : null}
                  <InfoBox icon="information-circle-outline" text="UPI opens once the admin adds the society's UPI ID." />
                </>
              ) : null}

              {isUpi && upi && !draftReady ? (
                createError ? (
                  <>
                    <InfoBox icon="alert-circle-outline" text={createError} raw />
                    <OutlineButton title="Try Again" icon="refresh" onPress={() => setCreateError(null)} />
                  </>
                ) : (
                  <View style={styles.preparing}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.infoText}>{t('Preparing your donation ID…')}</Text>
                  </View>
                )
              ) : null}

              {isUpi && upi && draftReady ? (
                <>
                  {method === 'QR Code' ? (
                    <UpiQrCard amount={amount} url={payUrl} upi={upi} donationNo={donationNo} />
                  ) : (
                    <PrimaryButton title={t('Pay {amount} with UPI App', { amount: formatINR(amount) })} icon="phone-portrait-outline" onPress={openUpiApp} />
                  )}
                  {upi.display_note ? <InfoBox icon="information-circle-outline" text={upi.display_note} raw /> : null}

                  <UpiSafetyNotice upiId={upi.upi_id} />
                  <FieldLabel text="UPI Transaction ID (UTR)" />
                  <InputField
                    icon="receipt-outline"
                    placeholder="12-digit number from your UPI app"
                    value={utr}
                    onChangeText={(text) => {
                      setUtr(digitsOnly(text).slice(0, 12));
                      setUtrError('');
                    }}
                    keyboardType="number-pad"
                    error={!!utrError}
                  />
                  {utrError ? <Text style={styles.error}>{t(utrError)}</Text> : null}

                  <FieldLabel text="Payment Screenshot (optional)" />
                  {screenshot ? (
                    <View style={styles.shot}>
                      <Image source={{ uri: screenshot.uri }} style={styles.shotImage} resizeMode="cover" />
                      <Text style={[styles.infoText, common.flex]}>{t('Screenshot added')}</Text>
                      <Pressable onPress={() => setScreenshot(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Remove')}>
                        <Ionicons name="close-circle" size={22} color={colors.mutedIcon} />
                      </Pressable>
                    </View>
                  ) : (
                    <OutlineButton title="Add Screenshot" icon="image-outline" onPress={pickScreenshot} />
                  )}

                  <PrimaryButton title="I've Paid – Submit" icon="checkmark-done-outline" onPress={submitUtr} loading={saving} />
                </>
              ) : null}

              {method === 'Cash' ? (
                <>
                  <InfoBox
                    icon="business-outline"
                    text="Pay at the Mandal office (7:00 PM – 9:00 PM). The treasurer will verify it and your receipt will appear in My Donations."
                  />
                  <PrimaryButton title={t('Confirm {amount} Cash Donation', { amount: formatINR(amount) })} icon="cash-outline" onPress={recordCash} loading={saving} />
                </>
              ) : null}
            </View>
          </>
        ) : null}

        {step === 'done' && receipt ? (
          <>
            <View style={styles.success}>
              <IconCircle size={72} color={tones.success.bg}>
                <Ionicons name="checkmark-circle" size={48} color={tones.success.text} />
              </IconCircle>
              <Text style={styles.successTitle}>{t('Thank you for your donation!')}</Text>
              <Text style={styles.successText}>
                {t(receipt.method === 'Cash'
                  ? 'Please pay at the office. Your receipt is confirmed once the treasurer receives it.'
                  : 'We have your payment details. The treasurer will verify them shortly.')}
              </Text>
            </View>

            <View style={styles.receipt}>
              <ReceiptRow label="Donation ID" value={receiptNo(receipt.id)} />
              <ReceiptRow label="Amount" value={formatINR(receipt.amount)} />
              <ReceiptRow label="Purpose" value={t(receipt.purpose)} />
              <ReceiptRow label="Paid by" value={t(receipt.method)} />
              <ReceiptRow label="Reference" value={receipt.reference ?? (receipt.method === 'Cash' ? t('To be paid at the office') : '-')} />
              <ReceiptRow label="Date" value={formatDateTime(new Date(receipt.date))} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>{t('Status')}</Text>
                <Pill label="Pending verification" tone={tones.warning} />
              </View>
            </View>

            <PrimaryButton title="View My Donations" icon="receipt-outline" onPress={() => navigation.navigate('MyDonations')} style={styles.gapTopLarge} />
            <OutlineButton title="Make Another Donation" icon="heart-outline" onPress={startAgain} style={styles.gapTop} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { padding: 16, paddingBottom: 32 },
  gapTop: { marginTop: 12 },
  gapTopLarge: { marginTop: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 18,
  },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  bannerText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  chips: { marginTop: 6, marginBottom: 18 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  preset: { ...surface, width: '30%', flexGrow: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  presetActive: { backgroundColor: colors.tint, borderColor: colors.primary },
  presetText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  presetTextActive: { color: colors.primary },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.noteBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
  },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textDark },
  summary: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 16 },
  summaryAmount: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  summaryPurpose: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  change: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, marginTop: 20, marginBottom: 10 },
  panel: { gap: 12, marginTop: 16 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.noteBackground, borderRadius: 12, padding: 12 },
  preparing: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  shot: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  shotImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.border },
  safety: { gap: 6, backgroundColor: colors.noteBackground, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  safetyTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  safetyLine: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textDark },
  declaration: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 4 },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textDark },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: -6, marginLeft: 2 },
  success: { alignItems: 'center', gap: 8, marginTop: 20 },
  successTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark, marginTop: 6 },
  successText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 12 },
  receipt: { ...surface, padding: 14, gap: 10, marginTop: 20 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  receiptLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  receiptValue: { flexShrink: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, textAlign: 'right' },
}));
