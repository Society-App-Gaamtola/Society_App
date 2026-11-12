import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DonateStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { DONATION_PRESETS, MIN_EXECUTIVE_DONATION } from '../config';
import { useAuth } from '../context/AuthContext';
import { useMyDonations } from '../hooks/useMyDonations';
import { isUtr, upiPayUrl, upiReady } from '../services/upi';
import { Ionicons, MaterialCommunityIcons, type IoniconName, type McIconName } from '../icons';
import type { DonationMethod, DonationPurpose, MyDonation } from '../types';
import { formatDateTime } from '../utils/date';
import { createId, formatINR } from '../utils/format';
import { digitsOnly } from '../utils/validation';
import { AppHeader, FieldLabel, FilterChips, IconCircle, InputField, OutlineButton, Pill, PrimaryButton, StepIndicator } from '../components';
import PaymentMethodList from '../components/donate/PaymentMethodList';
import UpiQrCard from '../components/donate/UpiQrCard';

type Step = 'amount' | 'pay' | 'done';
const STEPS = ['Amount', 'Payment', 'Receipt'];
const STEP_NUMBER: Record<Step, number> = { amount: 1, pay: 2, done: 3 };

const PURPOSES: DonationPurpose[] = ['Festival', 'Aarti', 'Cultural', 'General Fund', 'Other'];
const PURPOSE_ICON: Record<DonationPurpose, McIconName> = {
  Festival: 'firework',
  Aarti: 'candle',
  Cultural: 'drama-masks',
  'General Fund': 'bank-outline',
  Other: 'hand-heart',
};

/** Methods paid outside the app, confirmed by entering the UPI transaction ID. */
const NEEDS_UTR: DonationMethod[] = ['UPI App', 'QR Code'];
const GATEWAY_METHODS: DonationMethod[] = ['Card', 'Net Banking'];

function InfoBox({ icon, text }: { icon: IoniconName; text: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={styles.receiptValue}>{value}</Text>
    </View>
  );
}

// Guided donation: choose purpose and amount → choose how to pay → receipt.
// Card and net banking wait for a payment gateway; UPI waits for the society's UPI ID (services/upi.ts).
export default function DonateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<DonateStackParamList>>();
  const { user } = useAuth();
  const { add } = useMyDonations();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [step, setStep] = useState<Step>('amount');
  const [purpose, setPurpose] = useState<DonationPurpose>('Festival');
  const [preset, setPreset] = useState<number | null>(DONATION_PRESETS[1]);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState<DonationMethod>('UPI App');
  const [utr, setUtr] = useState('');
  const [utrError, setUtrError] = useState('');
  const [receipt, setReceipt] = useState<MyDonation | null>(null);

  const amount = custom ? Number(custom) : (preset ?? 0);
  const note = `${purpose} donation`;

  const goTo = (next: Step) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const record = (reference: string) => {
    const donation: MyDonation = {
      id: createId('md'),
      title: `${purpose} Donation`,
      date: new Date().toISOString(),
      amount,
      status: 'Pending',
      icon: PURPOSE_ICON[purpose],
      method,
      reference,
    };
    add(donation);
    setReceipt(donation);
    goTo('done');
  };

  const openUpiApp = async () => {
    const url = upiPayUrl(amount, note);
    if (!url) {
      return Alert.alert('UPI not set up yet', "Online UPI payments will start once the admin adds the society's UPI ID.");
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No UPI app found', 'Please install a UPI app such as Google Pay, PhonePe or Paytm.');
    }
  };

  const submitUtr = () => {
    if (!isUtr(utr)) return setUtrError('Enter the 12-digit UPI transaction ID (UTR) from your payment app.');
    record(utr.trim());
  };

  const payByGateway = () =>
    Alert.alert(
      'Secure payment coming soon',
      `${method} payments will open the secure payment page once the payment gateway is connected. Card details are never stored in this app.`,
    );

  const startAgain = () => {
    setUtr('');
    setUtrError('');
    setReceipt(null);
    goTo('amount');
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>Donate</Text>
        <Text style={common.subtextRelaxed}>Your support helps us organise festivals, aarti and cultural programmes.</Text>
        <StepIndicator steps={STEPS} current={STEP_NUMBER[step]} />

        {step === 'amount' ? (
          <>
            <View style={styles.banner}>
              <MaterialCommunityIcons name="hand-heart-outline" size={34} color={colors.white} />
              <View style={common.flex}>
                <Text style={styles.bannerTitle}>Contribute to Society Activities</Text>
                <Text style={styles.bannerText}>Every donation gets a receipt in My Donations.</Text>
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
              title={amount > 0 ? `Continue with ${formatINR(amount)}` : 'Choose an amount'}
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
                  {`Members who donate ${formatINR(MIN_EXECUTIVE_DONATION)} or more can apply to become an Executive.`}
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
                <MaterialCommunityIcons name={PURPOSE_ICON[purpose]} size={22} color={colors.primary} />
              </IconCircle>
              <View style={common.flex}>
                <Text style={styles.summaryAmount}>{formatINR(amount)}</Text>
                <Text style={styles.summaryPurpose}>{note}</Text>
              </View>
              <Pressable onPress={() => goTo('amount')} hitSlop={8} accessibilityRole="button">
                <Text style={styles.change}>Change</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Choose payment method</Text>
            <PaymentMethodList
              selected={method}
              onSelect={(m) => {
                setMethod(m);
                setUtrError('');
              }}
            />

            <View style={styles.panel}>
              {method === 'UPI App' ? (
                <>
                  <PrimaryButton title={`Pay ${formatINR(amount)} with UPI App`} icon="phone-portrait-outline" onPress={openUpiApp} />
                  {!upiReady() ? <InfoBox icon="information-circle-outline" text="UPI opens once the admin adds the society's UPI ID." /> : null}
                </>
              ) : null}

              {method === 'QR Code' ? <UpiQrCard amount={amount} note={note} /> : null}

              {NEEDS_UTR.includes(method) ? (
                <>
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
                  {utrError ? <Text style={styles.error}>{utrError}</Text> : null}
                  <OutlineButton title="I've Paid – Submit" icon="checkmark-done-outline" onPress={submitUtr} />
                </>
              ) : null}

              {GATEWAY_METHODS.includes(method) ? (
                <>
                  <InfoBox
                    icon="shield-checkmark-outline"
                    text={`You'll pay on the bank's secure page. Your ${method === 'Card' ? 'card details' : 'bank login'} never pass through this app.`}
                  />
                  <PrimaryButton title={`Pay ${formatINR(amount)} Securely`} icon="lock-closed-outline" onPress={payByGateway} />
                </>
              ) : null}

              {method === 'Cash' ? (
                <>
                  <InfoBox
                    icon="business-outline"
                    text="Pay at the Mandal office (7:00 PM – 9:00 PM). The treasurer will verify it and your receipt will appear in My Donations."
                  />
                  <PrimaryButton title={`Confirm ${formatINR(amount)} Cash Donation`} icon="cash-outline" onPress={() => record('To be paid at office')} />
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
              <Text style={styles.successTitle}>Thank you for your donation!</Text>
              <Text style={styles.successText}>
                {receipt.method === 'Cash'
                  ? 'Please pay at the office. Your receipt is confirmed once the treasurer receives it.'
                  : 'We have your payment details. The treasurer will verify them shortly.'}
              </Text>
            </View>

            <View style={styles.receipt}>
              <ReceiptRow label="Amount" value={formatINR(receipt.amount)} />
              <ReceiptRow label="Purpose" value={purpose} />
              <ReceiptRow label="Paid by" value={receipt.method} />
              <ReceiptRow label="Reference" value={receipt.reference ?? '-'} />
              <ReceiptRow label="Date" value={formatDateTime(new Date(receipt.date))} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status</Text>
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

const styles = StyleSheet.create({
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
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textDark },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: -6, marginLeft: 2 },
  success: { alignItems: 'center', gap: 8, marginTop: 20 },
  successTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark, marginTop: 6 },
  successText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 12 },
  receipt: { ...surface, padding: 14, gap: 10, marginTop: 20 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  receiptLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  receiptValue: { flexShrink: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, textAlign: 'right' },
});
