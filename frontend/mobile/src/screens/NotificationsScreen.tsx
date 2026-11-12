import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { notifications as sample } from '../data/mock';
import { Ionicons } from '../icons';
import type { AppNotification, NotificationKind } from '../types';
import { AppHeader, EmptyState, FilterChips, IconCircle } from '../components';

// Chip → the kind it shows
const FILTERS = ['All', 'Events', 'Notices', 'Payments'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_KIND: Record<Filter, NotificationKind | null> = { All: null, Events: 'event', Notices: 'notice', Payments: 'payment' };

const Separator = () => <View style={styles.separator} />;

// Sample alerts until the notifications API exists. Read state lives on this screen only.
export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [items, setItems] = useState<AppNotification[]>(sample);
  const [filter, setFilter] = useState<Filter>('All');

  const data = useMemo(() => {
    const kind = FILTER_KIND[filter];
    return kind ? items.filter((n) => n.kind === kind) : items;
  }, [items, filter]);

  const hasUnread = items.some((n) => n.unread);
  const markAllRead = () => setItems((list) => list.map((n) => ({ ...n, unread: false })));

  const open = useCallback(
    (notification: AppNotification) => {
      setItems((list) => list.map((n) => (n.id === notification.id ? { ...n, unread: false } : n)));
      navigation.navigate('NotificationDetails', { notification });
    },
    [navigation],
  );
  const renderItem = useCallback(({ item }: { item: AppNotification }) => <NotificationRow item={item} onOpen={open} />, [open]);

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={data}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <Text style={common.heading}>Notifications</Text>
              {hasUnread ? (
                <Pressable style={styles.markAll} onPress={markAllRead} hitSlop={8} accessibilityRole="button">
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                  <Text style={styles.markAllText}>Mark all as read</Text>
                </Pressable>
              ) : null}
            </View>
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon={<Ionicons name="notifications-off-outline" size={40} color={colors.lightGold} />} text="No notifications" />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const NotificationRow = memo(function NotificationRow({ item, onOpen }: { item: AppNotification; onOpen: (n: AppNotification) => void }) {
  return (
    <Pressable style={styles.card} onPress={() => onOpen(item)} accessibilityRole="button">
      <IconCircle size={42}>
        <Ionicons name={item.icon} size={20} color={colors.primary} />
      </IconCircle>
      <View style={styles.info}>
        <Text style={[styles.title, item.unread && styles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.time}>{item.time}</Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      <View style={styles.right}>
        {item.unread ? <View style={styles.dot} accessibilityLabel="Unread" /> : <View />}
        <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 10 },
  card: { ...surface, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  titleUnread: { fontFamily: fonts.bold },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  body: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 2 },
  right: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
