import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { CATEGORY_FILTERS, type CategoryFilter } from '../config/filters';
import { duties as initialDuties, myAssignments as initialAssignments } from '../data/mock';
import { Ionicons } from '../icons';
import type { Duty } from '../types';
import { AppHeader, FilterChips, IconCircle, MetaRow, PrimaryButton, SearchBar, StatusBadge } from '../components';
import ModalSheet from '../components/sheets/ModalSheet';

export default function VolunteerScreen() {
  const insets = useSafeAreaInsets();
  const [duties, setDuties] = useState<Duty[]>(initialDuties);
  const [assignments, setAssignments] = useState<Duty[]>(initialAssignments);
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAllAssignments, setShowAllAssignments] = useState(false);

  const visibleDuties = useMemo(() => {
    const q = query.trim().toLowerCase();
    return duties.filter(
      (d) => (filter === 'All' || d.category === filter) && (!q || d.title.toLowerCase().includes(q)),
    );
  }, [duties, filter, query]);

  const openDuties = duties.filter((d) => d.status === 'Open');
  const shownAssignments = showAllAssignments ? assignments : assignments.slice(0, 2);

  const volunteer = (duty: Duty) => {
    Alert.alert('Confirm Duty', `Do you want to volunteer for "${duty.title}" on ${duty.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          // TODO: send the volunteer request to the API.
          setDuties((list) => list.filter((d) => d.id !== duty.id));
          setAssignments((list) => [{ ...duty, status: 'Confirmed' }, ...list]);
          setSheetOpen(false);
        },
      },
    ]);
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>Volunteer & Duties</Text>
        <Text style={common.subtextRelaxed}>
          Support our society by volunteering for upcoming events and cultural activities.
        </Text>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search volunteer duties..."
          actionIcon="options-outline"
          actionLabel="Filters"
          onActionPress={() => Alert.alert('Filters', 'More filters coming soon.')}
        />

        <FilterChips options={CATEGORY_FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />

        <Text style={styles.sectionTitle}>Available Duties</Text>
        <View style={styles.list}>
          {visibleDuties.length ? (
            visibleDuties.map((duty) => (
              <DutyCard key={duty.id} duty={duty} onPress={duty.status === 'Open' ? () => volunteer(duty) : undefined} />
            ))
          ) : (
            <Text style={styles.empty}>No duties found</Text>
          )}
        </View>

        <PrimaryButton
          title="Volunteer for a Duty"
          icon="people-outline"
          onPress={() => setSheetOpen(true)}
          style={styles.volunteerButton}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Assignments</Text>
          {assignments.length > 2 ? (
            <Pressable onPress={() => setShowAllAssignments((v) => !v)} hitSlop={8}>
              <Text style={styles.viewAll}>{showAllAssignments ? 'Show Less' : 'View All →'}</Text>
            </Pressable>
          ) : (
            <Text style={styles.viewAll}>View All →</Text>
          )}
        </View>
        <View style={styles.list}>
          {shownAssignments.map((duty) => (
            <DutyCard key={duty.id} duty={duty} />
          ))}
        </View>
      </ScrollView>

      <ModalSheet
        visible={sheetOpen}
        animationType="slide"
        onClose={() => setSheetOpen(false)}
        style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}
      >
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Open Duties</Text>
        <Text style={styles.sheetSub}>Choose a duty you would like to volunteer for.</Text>
        <View style={styles.list}>
          {openDuties.length ? (
            openDuties.map((duty) => <DutyCard key={duty.id} duty={duty} onPress={() => volunteer(duty)} />)
          ) : (
            <Text style={styles.empty}>No open duties right now.</Text>
          )}
        </View>
      </ModalSheet>
    </View>
  );
}

function DutyCard({ duty, onPress }: { duty: Duty; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress} accessibilityRole="button">
      <IconCircle size={44}>
        <Ionicons name={duty.icon} size={20} color={colors.primary} />
      </IconCircle>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {duty.title}
        </Text>
        <MetaRow icon="calendar-outline" text={duty.date} />
        <MetaRow icon="location-outline" text={duty.venue} />
      </View>
      <View style={styles.right}>
        <StatusBadge status={duty.status} />
        <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  chips: { marginTop: 12, marginBottom: 16 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, marginBottom: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  viewAll: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary, marginBottom: 10 },
  list: { gap: 10 },
  volunteerButton: { marginTop: 16 },
  card: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark },
  sheetSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 12 },
});
