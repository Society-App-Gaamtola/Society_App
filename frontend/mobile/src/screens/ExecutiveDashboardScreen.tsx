import type { ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { hasPermission, useAuth, type Permission } from '../auth/AuthContext';
import { useExecEvents, type ExecEvent } from '../events/EventsContext';
import { events } from '../data/mock';
import { AppHeader } from '../components';
import { EventListCard, FeaturedCarousel, SectionHeader } from '../components/HomeSections';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Action = {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  /** Permission needed; undefined means every executive can use it. */
  permission?: Permission;
  onPress: () => void;
};

const PADDING = 16;
const PINK = '#F8E9E9';

const featured = events.filter((e) => ['e1', 'e5', 'e3'].includes(e.id));
const upcomingEvent = events[0];

const activityLabel: Record<ExecEvent['status'], string> = {
  Draft: 'Event draft saved',
  Posted: 'Event posted',
  Scheduled: 'Event scheduled',
  'Needs Approval': 'Event sent for approval',
};

const timeAgo = (timestamp: number) => {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const comingSoon = (label: string) => () => Alert.alert(label, 'Coming soon.');

export default function ExecutiveDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { myEvents } = useExecEvents();
  const openEvent = (eventId: string) => navigation.navigate('EventDetails', { eventId });

  const actions: Action[] = [
    { label: 'Create Event', icon: 'calendar-plus', permission: 'events', onPress: () => navigation.navigate('CreateEvent') },
    { label: 'Post Notice', icon: 'file-document-outline', permission: 'notices', onPress: comingSoon('Post Notice') },
    { label: 'My Events', icon: 'calendar-check-outline', permission: 'events', onPress: () => navigation.navigate('MyEvents') },
    { label: 'Event Planning', icon: 'clipboard-list-outline', permission: 'events', onPress: comingSoon('Event Planning') },
    { label: 'Upload Media', icon: 'image-plus', permission: 'media', onPress: comingSoon('Upload Media') },
    { label: 'Member Directory', icon: 'account-group-outline', onPress: comingSoon('Member Directory') },
  ];

  const recent = myEvents.slice(0, 3);

  return (
    <View style={styles.container}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <View style={styles.flex}>
            <Text style={styles.greeting}>Hello, {user?.name} 👋</Text>
            <Text style={styles.welcome}>Welcome to Executive Panel</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>👑 Executive Role</Text>
          </View>
        </View>

        <FeaturedCarousel items={featured} onOpen={openEvent} horizontalPadding={PADDING} />

        <View style={styles.grid}>
          {actions.map((action) => {
            const allowed = !action.permission || hasPermission(user, action.permission);
            return (
              <Pressable
                key={action.label}
                style={[styles.tile, !allowed && styles.tileLocked]}
                onPress={
                  allowed
                    ? action.onPress
                    : () => Alert.alert('Permission Required', "You don't have permission for this. Contact Super Admin.")
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: !allowed }}
              >
                <MaterialCommunityIcons name={action.icon} size={24} color={colors.primary} />
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {action.label}
                </Text>
                {!allowed ? (
                  <Ionicons name="lock-closed" size={12} color={colors.textMuted} style={styles.tileLock} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <SectionHeader
          title="Tasks Requiring Approval"
          icon={<Ionicons name="alert-circle-outline" size={18} color="#E0700B" />}
        />
        <View style={styles.approval}>
          <View style={styles.approvalIcon}>
            <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.approvalTitle}>Some actions are subject to Super Admin permission</Text>
            <Text style={styles.approvalText}>
              Event creation, financial activities and executive approvals require Super Admin approval as per society
              rules.
            </Text>
          </View>
        </View>

        <SectionHeader title="Upcoming Event" onViewAll={() => navigation.navigate('Events', { screen: 'EventsMain' })} />
        <EventListCard event={upcomingEvent} onPress={() => openEvent(upcomingEvent.id)} />

        <SectionHeader title="Recent Activity" onViewAll={() => navigation.navigate('MyEvents')} />
        <View style={styles.activityCard}>
          {recent.length ? (
            recent.map((e, i) => (
              <View key={e.id} style={[styles.activityRow, i > 0 && styles.activityDivider]}>
                <View style={styles.activityIcon}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.activityTitle}>{activityLabel[e.status]}</Text>
                  <Text style={styles.activitySub} numberOfLines={1}>
                    {e.title}
                  </Text>
                </View>
                <Text style={styles.activityTime}>{timeAgo(e.createdAt)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No recent activity yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: PADDING, paddingBottom: 32 },

  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  greeting: { fontFamily: fonts.bold, fontSize: 20, color: colors.textDark },
  welcome: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rolePill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EBD9A6',
    backgroundColor: '#FBF1D6',
    marginTop: 4,
  },
  roleText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#8A6A12' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  tile: {
    width: '31%',
    flexGrow: 1,
    height: 80,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  tileLocked: { opacity: 0.45 },
  tileLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDark },
  tileLock: { position: 'absolute', top: 8, right: 8 },

  approval: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF3E4',
    borderRadius: 12,
    padding: 12,
  },
  approvalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalTitle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.textDark },
  approvalText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 2 },

  activityCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  activityDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  activitySub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  activityTime: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  empty: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
});
