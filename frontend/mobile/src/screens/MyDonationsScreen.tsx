import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, themedStyles } from '../theme';
import { getMyDonations, toMyDonation } from '../api/member';
import { Ionicons, MaterialCommunityIcons, type IoniconName } from '../icons';
import type { MyDonation } from '../types';
import { formatDateTime } from '../utils/date';
import { formatINR } from '../utils/format';
import { ActionSheet, AppHeader, EmptyState, IconCircle, Pill } from '../components';
import { useT } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { donationReceiptPdf, donationSummaryFile, receiptNo, shareFile, type Donor } from '../services/receipt';
import type { ReportFormat } from '../types';

/** Every donation of the member, page by page (the summary sheet covers the whole history; unpaid UPI ones are left out) */
async function allMyDonations() {
  const all: MyDonation[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await getMyDonations(page, 50);
    all.push(...data.donations.map(toMyDonation).filter((d) => d.status !== 'Awaiting payment'));
    if (!data.pagination.has_more) return all;
  }
}

function StatCard({ icon, label, amount }: { icon: IoniconName; label: string; amount: number }) {
  const t = useT();
  return (
    <View style={styles.stat}>
      <IconCircle size={36}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </IconCircle>
      <Text style={styles.statLabel}>{t(label)}</Text>
      <Text style={styles.statAmount}>{formatINR(amount)}</Text>
    </View>
  );
}

/** onFinish: a UPI donation saved before paying (no UTR yet) reopens its payment step on the Donate screen */
function DonationCard({ donation, donor, onFinish }: { donation: MyDonation; donor: Donor; onFinish: () => void }) {
  const t = useT();
  const successful = donation.status === 'Successful';
  const failed = donation.status === 'Failed';
  const awaiting = donation.status === 'Awaiting payment';
  const [busy, setBusy] = useState(false);

  // A verified donation: a receipt PDF, shared through the phone's share sheet (WhatsApp, email, save …)
  const shareReceipt = async () => {
    setBusy(true);
    try {
      const uri = await donationReceiptPdf(donation, donor);
      await shareFile(uri, 'PDF', t('Receipt {no}', { no: receiptNo(donation.id) }));
    } catch (e) {
      Alert.alert(t('Could not create the receipt'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <IconCircle size={44}>
          <MaterialCommunityIcons name={donation.icon} size={22} color={colors.primary} />
        </IconCircle>
        <View style={common.flex}>
          <Text style={styles.title}>{donation.title}</Text>
          <Text style={styles.date}>{`${receiptNo(donation.id)} · ${formatDateTime(new Date(donation.date))} · ${t(donation.method)}`}</Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amount}>{formatINR(donation.amount)}</Text>
          <Pill label={donation.status} tone={successful ? tones.success : failed ? tones.danger : tones.warning} />
        </View>
      </View>
      <View style={common.divider} />
      <Pressable
        style={styles.receipt}
        disabled={busy}
        onPress={() =>
          awaiting
            ? onFinish()
            : successful
            ? shareReceipt()
            : failed
              ? Alert.alert(t('Not received'), t('The treasurer could not match this donation. Please contact the Mandal office.'))
              : Alert.alert(t('Receipt pending'), t('Your receipt will be ready once the treasurer verifies this donation.'))
        }
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={awaiting ? 'qr-code-outline' : successful ? 'share-social-outline' : 'download-outline'} size={18} color={colors.primary} />
        )}
        <Text style={styles.receiptText}>{t(awaiting ? 'Finish Payment' : successful ? 'Share Receipt (PDF)' : 'View Receipt')}</Text>
        {successful ? <Ionicons name="logo-whatsapp" size={16} color={colors.whatsapp} /> : <Ionicons name="chevron-forward" size={16} color={colors.mutedIcon} />}
      </Pressable>
    </View>
  );
}

// The member's donations from the backend (GET /user/donations), newest first.
// Totals count donations the treasurer has verified only; they come from the server.
export default function MyDonationsScreen() {
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const donor: Donor = { name: user?.name ?? '', memberId: user?.memberId };
  const [summaryMenu, setSummaryMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [donations, setDonations] = useState<MyDonation[]>([]);
  const [summary, setSummary] = useState({ total: 0, thisYear: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // One page of the latest 50 covers a member's history; older ones aren't shown yet
      const { data } = await getMyDonations(1, 50);
      setDonations(data.donations.map(toMyDonation));
      setSummary({ total: data.summary.total, thisYear: data.summary.this_year });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load your donations.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Also picks up a donation just made on the Donate screen
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { total, thisYear } = summary;

  const downloadSummary = async (format: ReportFormat) => {
    setExporting(true);
    try {
      const uri = await donationSummaryFile(await allMyDonations(), donor, summary, format);
      await shareFile(uri, format, t('My Donations'));
    } catch (e) {
      Alert.alert(t('Could not create the summary'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headingRow}>
          <Text style={[common.heading, common.flex]}>{t('My Donations')}</Text>
          {donations.length ? (
            <Pressable style={styles.summaryButton} onPress={() => setSummaryMenu(true)} disabled={exporting} accessibilityRole="button">
              {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="document-text-outline" size={16} color={colors.primary} />}
              <Text style={styles.summaryText}>{t('Summary')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.stats}>
          <StatCard icon="heart" label="Total Donated" amount={total} />
          <StatCard icon="calendar-outline" label="This Year" amount={thisYear} />
        </View>

        <Text style={styles.sectionTitle}>{t('Donation History')}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : donations.length ? (
          <View style={styles.list}>
            {donations.map((d) => (
              <DonationCard
                key={d.id}
                donation={d}
                donor={donor}
                onFinish={() =>
                  navigation.navigate('Main', {
                    screen: 'Donate',
                    params: {
                      screen: 'DonateMain',
                      params: {
                        resume: { id: Number(d.id), amount: d.amount, purpose: d.purpose, method: d.method === 'UPI App' ? 'UPI App' : 'QR Code' },
                      },
                    },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<Ionicons name={error ? 'cloud-offline-outline' : 'heart-outline'} size={40} color={colors.lightGold} />}
            text={error ? "Couldn't load your donations. Pull down to try again." : 'No donations yet'}
          />
        )}

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
          <Text style={styles.noteText}>{t('Every donation is checked by the treasurer before its receipt is issued.')}</Text>
        </View>
      </ScrollView>
      <ActionSheet
        visible={summaryMenu}
        title="Download donation summary"
        onClose={() => setSummaryMenu(false)}
        actions={[
          { label: 'PDF', icon: 'document-outline', onPress: () => downloadSummary('PDF') },
          { label: 'Excel', icon: 'grid-outline', onPress: () => downloadSummary('Excel') },
        ]}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { padding: 16, paddingBottom: 32 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 18, paddingHorizontal: 12, height: 34 },
  summaryText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  stats: { flexDirection: 'row', gap: 12, marginTop: 14 },
  stat: { ...surface, flex: 1, padding: 12, gap: 4 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  statAmount: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark, marginTop: 20, marginBottom: 10 },
  list: { gap: 12 },
  loading: { marginVertical: 24 },
  card: { ...surface, paddingHorizontal: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  amountCol: { alignItems: 'flex-end', gap: 6 },
  amount: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  receiptText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.noteBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
}));
