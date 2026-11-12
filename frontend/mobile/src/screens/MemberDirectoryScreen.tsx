import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { common, surface } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { directoryMembers } from '../data/mock';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '../icons';
import type { DirectoryMember } from '../types';
import { AppHeader, EmptyState, FilterChips, IconCircle, MetaRow, Pill, SearchBar } from '../components';

const FILTERS = ['All', 'Executive', 'Member'] as const;
type Filter = (typeof FILTERS)[number];

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const Separator = () => <View style={styles.separator} />;

// Sample directory until the members API exists. Members see name and ID; executives also see mobile numbers.
export default function MemberDirectoryScreen() {
  const { user } = useAuth();
  const showMobile = user?.role === 'executive';
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directoryMembers.filter(
      (m) =>
        (filter === 'All' || m.role === filter) &&
        (!q || m.name.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  const renderItem = useCallback(
    ({ item }: { item: DirectoryMember }) => <MemberRow member={item} showMobile={showMobile} />,
    [showMobile],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>Member Directory</Text>
            <Text style={common.subtextRelaxed}>Find society members by name or member ID.</Text>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or member ID..." />
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon={<Ionicons name="people-outline" size={40} color={colors.lightGold} />} text="No members found" />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const MemberRow = memo(function MemberRow({ member, showMobile }: { member: DirectoryMember; showMobile: boolean }) {
  const executive = member.role === 'Executive';
  return (
    <View style={styles.card}>
      <IconCircle size={44} color={executive ? '#FBF1D6' : colors.tint}>
        <Text style={styles.initials}>{initials(member.name)}</Text>
      </IconCircle>
      <View style={styles.info}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.memberId}>{`Member ID: ${member.memberId}`}</Text>
        {showMobile ? <MetaRow icon="call-outline" text={member.mobile} /> : null}
      </View>
      <Pill label={member.role} tone={executive ? tones.warning : tones.info} />
    </View>
  );
});

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 10 },
  card: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  initials: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  memberId: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});
