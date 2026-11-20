import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, themedStyles } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { getMembers, type ApiMember, type ApiRole } from '../api/member';
import { mediaUrl } from '../api/client';
import { cdnImage } from '../services/media';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons } from '../icons';
import type { DirectoryMember } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, EmptyState, FilterChips, IconCircle, MetaRow, Pill, SearchBar } from '../components';
import ModalSheet from '../components/sheets/ModalSheet';
import { useT } from '../i18n';

const FILTERS = ['All', 'Executive', 'Member'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_ROLE: Record<Filter, ApiRole | undefined> = { All: undefined, Executive: 'executive', Member: 'member' };
const ROLE_LABEL: Record<ApiRole, DirectoryMember['role']> = { super_admin: 'Admin', executive: 'Executive', member: 'Member' };
const AVATAR = 44;
const BIG_AVATAR = 84;

const digits = (phone: string) => phone.replace(/[^\d+]/g, '');
const roleTone = (role: DirectoryMember['role']) => (role === 'Admin' ? tones.danger : role === 'Executive' ? tones.warning : tones.info);

const toMember = (m: ApiMember): DirectoryMember => ({
  id: String(m.id),
  name: m.name || 'Member',
  memberId: m.member_code ?? '',
  role: ROLE_LABEL[m.role],
  photoUrl: mediaUrl(m.photo_url),
  mobile: m.mobile,
  email: m.email,
});

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const Separator = () => <View style={styles.separator} />;

// Members from the backend (GET /user/members), searched by name or member ID on the server.
// Mobile and email show when the member allows it; executives and the admin always see them.
export default function MemberDirectoryScreen() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());
  const role = FILTER_ROLE[filter];

  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getMembers(page, { search, role });
      return { items: data.members.map(toMember), pagination: data.pagination };
    },
    [search, role],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);
  // The member whose details are open (tap a row)
  const [open, setOpen] = useState<DirectoryMember | null>(null);

  const renderItem = useCallback(({ item }: { item: DirectoryMember }) => <MemberRow member={item} onOpen={setOpen} />, []);

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>{t('Member Directory')}</Text>
            <Text style={common.subtextRelaxed}>{t('Find society members by name or member ID.')}</Text>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search by name or member ID..." />
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'people-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load members. Pull down to try again." : 'No members found'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
        renderItem={renderItem}
      />
      <MemberDetailsSheet member={open} onClose={() => setOpen(null)} />
    </View>
  );
}

type ContactAction = { key: string; icon: 'call-outline' | 'logo-whatsapp' | 'mail-outline'; label: string; value: string; url: string };

/** What can be done with a member's shared contact details */
function contactActions(member: DirectoryMember): ContactAction[] {
  const actions: ContactAction[] = [];
  if (member.mobile) {
    const phone = digits(member.mobile);
    actions.push({ key: 'call', icon: 'call-outline', label: 'Call', value: member.mobile, url: `tel:${phone}` });
    actions.push({ key: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp', value: member.mobile, url: `https://wa.me/${phone.replace('+', '')}` });
  }
  if (member.email) actions.push({ key: 'email', icon: 'mail-outline', label: 'Email', value: member.email, url: `mailto:${member.email}` });
  return actions;
}

/** Tapping a member: photo, member type and ID, and call / WhatsApp / email when the member shares them */
function MemberDetailsSheet({ member, onClose }: { member: DirectoryMember | null; onClose: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const photo = member ? cdnImage(member.photoUrl, BIG_AVATAR * 2) : null;
  const actions = member ? contactActions(member) : [];

  return (
    <ModalSheet visible={!!member} animationType="slide" onClose={onClose} style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
      {member ? (
        <>
          <View style={styles.sheetHead}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.bigAvatar} />
            ) : (
              <IconCircle size={BIG_AVATAR} color={member.role === 'Member' ? colors.tint : colors.goldTint}>
                <Text style={styles.bigInitials}>{initials(member.name)}</Text>
              </IconCircle>
            )}
            <Text style={styles.sheetName}>{member.name}</Text>
            <Pill label={member.role} tone={roleTone(member.role)} />
            {member.memberId ? <Text style={styles.memberId}>{t('Member ID: {id}', { id: member.memberId })}</Text> : null}
          </View>
          {actions.length ? (
            actions.map((action) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                onPress={() => Linking.openURL(action.url).catch(() => {})}
                accessibilityRole="link"
              >
                <IconCircle size={36} color={colors.tint}>
                  <Ionicons name={action.icon} size={18} color={colors.primary} />
                </IconCircle>
                <View style={common.flex}>
                  <Text style={styles.actionLabel}>{t(action.label)}</Text>
                  <Text style={styles.actionValue} numberOfLines={1}>
                    {action.value}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          ) : (
            <Text style={styles.private}>{t('This member keeps their contact details private.')}</Text>
          )}
        </>
      ) : null}
    </ModalSheet>
  );
}

const MemberRow = memo(function MemberRow({ member, onOpen }: { member: DirectoryMember; onOpen: (member: DirectoryMember) => void }) {
  const t = useT();
  const leader = member.role !== 'Member';
  const photo = cdnImage(member.photoUrl, AVATAR * 2);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onOpen(member)}
      accessibilityRole="button"
      accessibilityLabel={t('View details of {name}', { name: member.name })}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} />
      ) : (
        <IconCircle size={AVATAR} color={leader ? colors.goldTint : colors.tint}>
          <Text style={styles.initials}>{initials(member.name)}</Text>
        </IconCircle>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{member.name}</Text>
        {member.memberId ? <Text style={styles.memberId}>{t('Member ID: {id}', { id: member.memberId })}</Text> : null}
        {member.mobile ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${digits(member.mobile!)}`).catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel={`Call ${member.name}`}
          >
            <MetaRow icon="call-outline" text={member.mobile} />
          </Pressable>
        ) : null}
        {member.email ? <MetaRow icon="mail-outline" text={member.email} /> : null}
      </View>
      <Pill label={member.role} tone={roleTone(member.role)} />
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = themedStyles(() => ({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 10 },
  loading: { marginVertical: 24 },
  card: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  cardPressed: { opacity: 0.85 },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 16 },
  sheetHead: { alignItems: 'center', gap: 6, marginBottom: 12 },
  bigAvatar: { width: BIG_AVATAR, height: BIG_AVATAR, borderRadius: BIG_AVATAR / 2, backgroundColor: colors.border },
  bigInitials: { fontFamily: fonts.bold, fontSize: 26, color: colors.primary },
  sheetName: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark, textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  actionPressed: { backgroundColor: colors.tint },
  actionLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  actionValue: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  private: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.border },
  initials: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  memberId: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
}));
