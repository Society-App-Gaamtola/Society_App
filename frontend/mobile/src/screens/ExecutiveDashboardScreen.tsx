import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { hasPermission, useAuth } from '../context/AuthContext';
import { useExecEvents } from '../context/EventsContext';
import { events, featuredEvents } from '../data/mock';
import { Ionicons, MaterialCommunityIcons, type McIconName } from '../icons';
import type { ExecEventStatus, Permission } from '../types';
import { timeAgo } from '../utils/date';
import { AppHeader, EventListCard, FeaturedCarousel, IconCircle, SectionHeader } from '../components';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Action = {
  label: string;
  icon: McIconName;
  /** Permission needed; undefined means every executive can use it. */
  permission?: Permission;
  onPress: () => void;
};

const PADDING = 16;

const upcomingEvent = events[0];

const activityLabel: Record<ExecEventStatus, string> = {
  Draft: 'Event draft saved',
  Posted: 'Event posted',
  Scheduled: 'Event scheduled',
  'Needs Approval': 'Event sent for approval',
};

const comingSoon = (label: string) => () => Alert.alert(label, 'Coming soon.');

export default function ExecutiveDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { myEvents } = useExecEvents();
  const openEvent = useCallback((eventId: string) => navigation.navigate('EventDetails', { eventId }), [navigation]);

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
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <View style={common.flex}>
            <Text style={styles.greeting}>Hello, {user?.name} 👋</Text>
            <Text style={styles.welcome}>Welcome to Executive Panel</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>👑 Executive Role</Text>
          </View>
        </View>

        <FeaturedCarousel items={featuredEvents} onOpen={openEvent} horizontalPadding={PADDING} />

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
                {!allowed ? <Ionicons name="lock-closed" size={12} color={colors.textMuted} style={styles.tileLock} /> : null}
              </Pressable>
            );
          })}
        </View>

        <SectionHeader
          title="Tasks Requiring Approval"
          icon={<Ionicons name="alert-circle-outline" size={18} color={colors.warning} />}
        />
        <View style={styles.approval}>
          <IconCircle size={40}>
            <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
          </IconCircle>
          <View style={common.flex}>
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
                <IconCircle size={36} radius={8}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </IconCircle>
                <View style={common.flex}>
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
    ...surface,
    width: '31%',
    flexGrow: 1,
    height: 80,
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
    backgroundColor: colors.noteBackground,
    borderRadius: 12,
    padding: 12,
  },
  approvalTitle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.textDark },
  approvalText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 2 },

  activityCard: { ...surface, paddingHorizontal: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  activityDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  activityTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  activitySub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  activityTime: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  empty: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
});
