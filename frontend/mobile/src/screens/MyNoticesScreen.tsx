import { memo, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, themedStyles } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { deleteNotice, getMyNotices, setNoticeStatus, type ApiExecNotice, type ApiNoticeStatus } from '../api/executive';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons, type IoniconName } from '../icons';
import { formatDate } from '../utils/date';
import { showToast } from '../utils/toast';
import { AppHeader, EmptyState, FilterChips, PermissionGate, Pill } from '../components';
import { useT } from '../i18n';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'MyNotices'>;

const FILTERS = ['All', 'Drafts', 'Published'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_STATUS: Record<Filter, ApiNoticeStatus | undefined> = { All: undefined, Drafts: 'draft', Published: 'published' };

const Separator = () => <View style={styles.separator} />;

/** The notices this user posted, any status (GET /user/notices?mine=true): edit, publish / unpublish, delete */
export default function MyNoticesScreen() {
  return (
    <PermissionGate permission="notices">
      <MyNotices />
    </PermissionGate>
  );
}

function MyNotices() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('All');

  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getMyNotices(page, { status: FILTER_STATUS[filter] });
      return { items: data.notices, pagination: data.pagination };
    },
    [filter],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  // Back from Post / Edit Notice: show the saved notice
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) refresh();
      focusedBefore.current = true;
    }, [refresh]),
  );

  const fail = useCallback((e: unknown) => Alert.alert(t('Something went wrong'), e instanceof Error ? e.message : t('Please try again.')), [t]);

  const onOpen = useCallback((n: ApiExecNotice) => navigation.navigate('NoticeDetails', { noticeId: String(n.id) }), [navigation]);
  const onEdit = useCallback((n: ApiExecNotice) => navigation.navigate('PostNotice', { noticeId: n.id }), [navigation]);
  const onToggle = useCallback(
    (n: ApiExecNotice) =>
      setNoticeStatus(n.id, n.status === 'published' ? 'draft' : 'published')
        .then(({ message }) => {
          showToast(message);
          refresh();
        })
        .catch(fail),
    [refresh, fail],
  );
  const onDelete = useCallback(
    (n: ApiExecNotice) =>
      Alert.alert(t('Delete Notice'), t('Delete "{title}"?', { title: n.title }), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () =>
            deleteNotice(n.id)
              .then(({ message }) => {
                showToast(message);
                refresh();
              })
              .catch(fail),
        },
      ]),
    [refresh, fail, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiExecNotice }) => <NoticeCard notice={item} onOpen={onOpen} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />,
    [onOpen, onEdit, onToggle, onDelete],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View style={common.flex}>
                <Text style={common.heading}>{t('My Notices')}</Text>
                <Text style={common.subtextRelaxed}>{t('Notices you have posted.')}</Text>
              </View>
              <Pressable style={styles.addButton} onPress={() => navigation.navigate('PostNotice')} accessibilityRole="button">
                <Text style={styles.addButtonText}>{t('+ New')}</Text>
              </Pressable>
            </View>
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'document-text-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load your notices. Pull down to try again." : 'No notices yet'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
        renderItem={renderItem}
      />
    </View>
  );
}

type CardProps = {
  notice: ApiExecNotice;
  onOpen: (n: ApiExecNotice) => void;
  onEdit: (n: ApiExecNotice) => void;
  onToggle: (n: ApiExecNotice) => void;
  onDelete: (n: ApiExecNotice) => void;
};

const NoticeCard = memo(function NoticeCard({ notice, onOpen, onEdit, onToggle, onDelete }: CardProps) {
  const published = notice.status === 'published';
  const date = formatDate(new Date(notice.published_at ?? notice.created_at));
  return (
    <View style={styles.card}>
      <Pressable onPress={() => onOpen(notice)} accessibilityRole="button">
        <View style={styles.cardTop}>
          <Text style={styles.title} numberOfLines={2}>
            {notice.title}
          </Text>
          <Pill label={published ? 'Published' : 'Draft'} tone={published ? tones.success : tones.neutral} />
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {notice.body}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Action icon="create-outline" label="Edit" onPress={() => onEdit(notice)} />
        <Action icon={published ? 'eye-off-outline' : 'send-outline'} label={published ? 'Unpublish' : 'Publish'} onPress={() => onToggle(notice)} />
        <Action icon="trash-outline" label="Delete" danger onPress={() => onDelete(notice)} />
      </View>
    </View>
  );
});

function Action({ icon, label, onPress, danger }: { icon: IoniconName; label: string; onPress: () => void; danger?: boolean }) {
  const t = useT();
  return (
    <Pressable style={styles.action} onPress={onPress} hitSlop={6} accessibilityRole="button">
      <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.textDark} />
      <Text style={[styles.actionText, danger && styles.danger]}>{t(label)}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addButton: { height: 34, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', marginTop: 4 },
  addButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
  chips: { marginTop: 12, marginBottom: 14 },
  loading: { marginVertical: 24 },
  separator: { height: 12 },
  card: { ...surface, padding: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  body: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 4 },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  danger: { color: colors.danger },
}));
