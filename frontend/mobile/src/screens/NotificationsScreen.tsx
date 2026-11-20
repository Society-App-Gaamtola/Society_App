import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { getNotifications, readAllNotifications, readNotification, type ApiNotification, type ApiNotificationType } from '../api/member';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons, type IoniconName } from '../icons';
import type { AppNotification, NotificationKind } from '../types';
import { formatDateTime, timeAgo } from '../utils/date';
import { AppHeader, EmptyState, FilterChips, IconCircle } from '../components';
import { useT } from '../i18n';

// Chip → the notification type it shows (GET /user/notifications?type=)
const FILTERS = ['All', 'Events', 'Notices', 'Payments', 'Updates'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_TYPE: Record<Filter, ApiNotificationType | undefined> = {
  All: undefined,
  Events: 'event',
  Notices: 'notice',
  Payments: 'donation',
  Updates: 'general',
};

const KIND: Record<ApiNotificationType, NotificationKind> = { event: 'event', notice: 'notice', donation: 'payment', general: 'general' };

const iconFor = (n: ApiNotification): IoniconName =>
  n.ref_type === 'media' ? 'images-outline'
    : n.type === 'event' ? 'calendar-outline'
      : n.type === 'notice' ? 'document-text-outline'
        : n.type === 'donation' ? 'cash-outline'
          : 'notifications-outline';

// Under a day: "5 min ago"; older: the date and time
const timeLabel = (iso: string) => {
  const at = new Date(iso);
  return Date.now() - at.getTime() < 24 * 60 * 60 * 1000 ? timeAgo(at.getTime()) : formatDateTime(at);
};

export const toAppNotification = (n: ApiNotification): AppNotification => ({
  id: String(n.id),
  kind: KIND[n.type],
  refType: n.ref_type,
  refId: n.ref_id == null ? null : String(n.ref_id),
  title: n.title,
  body: n.body,
  message: n.body,
  time: timeLabel(n.created_at),
  icon: iconFor(n),
  unread: !n.is_read,
});

const Separator = () => <View style={styles.separator} />;

// The user's notifications from the backend, newest first. Opening one marks it read.
export default function NotificationsScreen() {
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [filter, setFilter] = useState<Filter>('All');
  const [unread, setUnread] = useState(0);
  // Read on this screen before the list reloads
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [allRead, setAllRead] = useState(false);

  const type = FILTER_TYPE[filter];
  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getNotifications(page, type);
      setUnread(data.unread_count);
      // A fresh first page carries the server's read state; later pages add to the list already shown
      if (page === 1) {
        setReadIds(new Set());
        setAllRead(false);
      }
      return { items: data.notifications.map(toAppNotification), pagination: data.pagination };
    },
    [type],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  const isUnread = useCallback((n: AppNotification) => n.unread && !allRead && !readIds.has(n.id), [allRead, readIds]);

  const markAllRead = () => {
    setAllRead(true);
    setUnread(0);
    readAllNotifications().catch(() => refresh());
  };

  const open = useCallback(
    (notification: AppNotification) => {
      if (isUnread(notification)) {
        setReadIds((ids) => new Set(ids).add(notification.id));
        setUnread((count) => Math.max(0, count - 1));
        readNotification(Number(notification.id)).catch(() => {});
      }
      navigation.navigate('NotificationDetails', { notification: { ...notification, unread: false } });
    },
    [navigation, isUnread],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => <NotificationRow item={item} unread={isUnread(item)} onOpen={open} />,
    [open, isUnread],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <Text style={common.heading}>{t('Notifications')}</Text>
              {unread > 0 ? (
                <Pressable style={styles.markAll} onPress={markAllRead} hitSlop={8} accessibilityRole="button">
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                  <Text style={styles.markAllText}>{t('Mark all as read ({n})', { n: unread })}</Text>
                </Pressable>
              ) : null}
            </View>
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'notifications-off-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load notifications. Pull down to try again." : 'No notifications yet'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
        renderItem={renderItem}
      />
    </View>
  );
}

const NotificationRow = memo(function NotificationRow({
  item,
  unread,
  onOpen,
}: {
  item: AppNotification;
  unread: boolean;
  onOpen: (n: AppNotification) => void;
}) {
  return (
    <Pressable style={styles.card} onPress={() => onOpen(item)} accessibilityRole="button">
      <IconCircle size={42}>
        <Ionicons name={item.icon} size={20} color={colors.primary} />
      </IconCircle>
      <View style={styles.info}>
        <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.time}>{item.time}</Text>
        {item.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {unread ? <View style={styles.dot} accessibilityLabel="Unread" /> : <View />}
        <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
      </View>
    </Pressable>
  );
});

const styles = themedStyles(() => ({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 10 },
  loading: { marginVertical: 24 },
  card: { ...surface, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  titleUnread: { fontFamily: fonts.bold },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  body: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 2 },
  right: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
}));
