import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { duties as initialDuties, myAssignments as initialAssignments, type Duty } from '../data/mock';
import { AppHeader, FilterChips, PrimaryButton, StatusBadge } from '../components';

const FILTERS = ['All', 'Festival', 'Aarti', 'Cultural', 'Meeting'] as const;
type Filter = (typeof FILTERS)[number];

const MUTED_ICON = '#9A8F86';
const PLACEHOLDER = '#A89E94';
const PINK = '#F8E9E9';

export default function VolunteerScreen() {
  const insets = useSafeAreaInsets();
  const [duties, setDuties] = useState<Duty[]>(initialDuties);
  const [assignments, setAssignments] = useState<Duty[]>(initialAssignments);
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
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
    <View style={styles.container}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Volunteer & Duties</Text>
        <Text style={styles.subtext}>
          Support our society by volunteering for upcoming events and cultural activities.
        </Text>

        <View style={styles.searchRow}>
          <View style={[styles.search, searchFocused && styles.searchFocused]}>
            <Ionicons name="search-outline" size={18} color={MUTED_ICON} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search volunteer duties..."
              placeholderTextColor={PLACEHOLDER}
              style={styles.searchInput}
              returnKeyType="search"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={MUTED_ICON} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={styles.filterButton}
            onPress={() => Alert.alert('Filters', 'More filters coming soon.')}
            accessibilityRole="button"
            accessibilityLabel="Filters"
          >
            <Ionicons name="options-outline" size={20} color={colors.textDark} />
          </Pressable>
        </View>

        <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />

        <Text style={styles.sectionTitle}>Available Duties</Text>
        <View style={styles.list}>
          {visibleDuties.length ? (
            visibleDuties.map((duty) => (
              <DutyCard
                key={duty.id}
                duty={duty}
                onPress={duty.status === 'Open' ? () => volunteer(duty) : undefined}
              />
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

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
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
        </View>
      </Modal>
    </View>
  );
}

function DutyCard({ duty, onPress }: { duty: Duty; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress} accessibilityRole="button">
      <View style={styles.icon}>
        <Ionicons name={duty.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {duty.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.meta} numberOfLines={1}>
            {duty.date}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.meta} numberOfLines={1}>
            {duty.venue}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <StatusBadge status={duty.status} />
        <Ionicons name="chevron-forward" size={18} color={MUTED_ICON} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  search: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchFocused: { borderColor: colors.primary },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 13, color: colors.textDark, padding: 0 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(43, 26, 18, 0.35)' },
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
