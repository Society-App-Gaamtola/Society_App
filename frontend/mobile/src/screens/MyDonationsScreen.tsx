import { useCallback, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { common, surface } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { useMyDonations } from '../hooks/useMyDonations';
import { Ionicons, MaterialCommunityIcons, type IoniconName } from '../icons';
import type { MyDonation } from '../types';
import { formatDateTime } from '../utils/date';
import { formatINR } from '../utils/format';
import { AppHeader, IconCircle, Pill } from '../components';

const sum = (list: MyDonation[]) => list.reduce((total, d) => total + d.amount, 0);

function StatCard({ icon, label, amount }: { icon: IoniconName; label: string; amount: number }) {
  return (
    <View style={styles.stat}>
      <IconCircle size={36}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </IconCircle>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statAmount}>{formatINR(amount)}</Text>
    </View>
  );
}

function DonationCard({ donation }: { donation: MyDonation }) {
  const successful = donation.status === 'Successful';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <IconCircle size={44}>
          <MaterialCommunityIcons name={donation.icon} size={22} color={colors.primary} />
        </IconCircle>
        <View style={common.flex}>
          <Text style={styles.title}>{donation.title}</Text>
          <Text style={styles.date}>{`${formatDateTime(new Date(donation.date))} · ${donation.method}`}</Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amount}>{formatINR(donation.amount)}</Text>
          <Pill label={successful ? 'Successful' : 'Pending'} tone={successful ? tones.success : tones.warning} />
        </View>
      </View>
      <View style={common.divider} />
      <Pressable
        style={styles.receipt}
        onPress={() =>
          successful
            ? Alert.alert('Receipt', `${donation.title}\n${formatINR(donation.amount)} · ${donation.method}\nReference: ${donation.reference ?? '-'}`)
            : Alert.alert('Receipt pending', 'Your receipt will be ready once the treasurer verifies this donation.')
        }
        accessibilityRole="button"
      >
        <Ionicons name="download-outline" size={18} color={colors.primary} />
        <Text style={styles.receiptText}>View Receipt</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedIcon} />
      </Pressable>
    </View>
  );
}

// Saved on the phone until the member donations API exists. Totals count verified donations only.
export default function MyDonationsScreen() {
  const { donations, reload } = useMyDonations();

  // Pick up a donation just made on the Donate screen.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const { total, thisYear } = useMemo(() => {
    const verified = donations.filter((d) => d.status === 'Successful');
    const year = new Date().getFullYear();
    return { total: sum(verified), thisYear: sum(verified.filter((d) => new Date(d.date).getFullYear() === year)) };
  }, [donations]);

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>My Donations</Text>

        <View style={styles.stats}>
          <StatCard icon="heart" label="Total Donated" amount={total} />
          <StatCard icon="calendar-outline" label="This Year" amount={thisYear} />
        </View>

        <Text style={styles.sectionTitle}>Donation History</Text>
        <View style={styles.list}>
          {donations.map((d) => (
            <DonationCard key={d.id} donation={d} />
          ))}
        </View>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
          <Text style={styles.noteText}>Your donations are secure and processed through our verified payment partner.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 14 },
  stat: { ...surface, flex: 1, padding: 12, gap: 4 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  statAmount: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark, marginTop: 20, marginBottom: 10 },
  list: { gap: 12 },
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
});
