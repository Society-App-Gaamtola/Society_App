import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common, surface } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { getMediaQueue, reviewMedia, type ApiMedia } from '../api/media';
import { usePagedList } from '../hooks/usePagedList';
import { cdnImage } from '../services/media';
import { Ionicons } from '../icons';
import { formatDate } from '../utils/date';
import { showToast } from '../utils/toast';
import { AppHeader, EmptyState, FormField, OutlineButton, PermissionGate, PrimaryButton, SegmentedTabs, TextAreaField } from '../components';
import ModalSheet from '../components/sheets/ModalSheet';
import { useT } from '../i18n';

type Status = ApiMedia['status'];
const TABS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
] as const;
const MAX_REASON = 500;
const IMAGE_HEIGHT = 200;

const Separator = () => <View style={styles.separator} />;

/** Gallery uploads waiting for approval, and the approved / rejected ones (the Media section) */
export default function MediaApprovalScreen() {
  return (
    <PermissionGate permission="media">
      <MediaApproval />
    </PermissionGate>
  );
}

function MediaApproval() {
  const t = useT();
  const [tab, setTab] = useState<Status>('pending');
  const [rejecting, setRejecting] = useState<ApiMedia | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getMediaQueue(page, tab);
      return { items: data.media, pagination: data.pagination };
    },
    [tab],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  const review = useCallback(
    async (m: ApiMedia, action: 'approve' | 'reject', reason?: string) => {
      setBusyId(m.id);
      try {
        const { message } = await reviewMedia(m.id, action, reason);
        showToast(message);
        setRejecting(null);
        refresh();
      } catch (e) {
        Alert.alert(t('Something went wrong'), e instanceof Error ? e.message : t('Please try again.'));
      } finally {
        setBusyId(null);
      }
    },
    [refresh, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiMedia }) => (
      <MediaCard item={item} busy={busyId === item.id} onApprove={(m) => review(m, 'approve')} onReject={setRejecting} />
    ),
    [busyId, review],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>{t('Media Approval')}</Text>
            <Text style={common.subtextRelaxed}>{t('Photos and videos members uploaded to the gallery.')}</Text>
            <SegmentedTabs tabs={TABS} selected={tab} onSelect={setTab} style={styles.tabs} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'images-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load the uploads. Pull down to try again." : tab === 'pending' ? 'Nothing waiting for approval' : 'Nothing here yet'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
        renderItem={renderItem}
      />

      {rejecting ? <RejectSheet item={rejecting} busy={busyId === rejecting.id} onClose={() => setRejecting(null)} onReject={(reason) => review(rejecting, 'reject', reason)} /> : null}
    </View>
  );
}

type CardProps = { item: ApiMedia; busy: boolean; onApprove: (m: ApiMedia) => void; onReject: (m: ApiMedia) => void };

const MediaCard = memo(function MediaCard({ item, busy, onApprove, onReject }: CardProps) {
  const t = useT();
  const { width } = useWindowDimensions();
  const isVideo = item.media_type === 'video';
  const preview = cdnImage(isVideo ? item.thumbnail_url : item.media_url, width);
  const open = () => Linking.openURL(item.media_url).catch(() => {});

  return (
    <View style={styles.card}>
      <Pressable onPress={open} accessibilityRole="imagebutton" accessibilityLabel={t(isVideo ? 'Play video' : 'Open photo')}>
        {preview ? <Image source={{ uri: preview }} style={styles.image} /> : <View style={[styles.image, styles.noPreview]} />}
        {isVideo ? (
          <View style={styles.play}>
            <Ionicons name="play" size={22} color={colors.white} />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.info}>
        {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
        <Text style={styles.meta}>
          {item.uploaded_by_name} · {item.category.name} · {formatDate(new Date(item.created_at))}
        </Text>
        {item.status === 'rejected' && item.rejection_reason ? (
          <Text style={styles.reason}>{t('Rejected: {reason}', { reason: item.rejection_reason })}</Text>
        ) : null}
        <View style={styles.buttons}>
          {item.status !== 'rejected' ? (
            <OutlineButton title={item.status === 'approved' ? 'Take Down' : 'Reject'} icon="close" onPress={busy ? () => {} : () => onReject(item)} style={styles.button} />
          ) : null}
          {item.status !== 'approved' ? <PrimaryButton title="Approve" icon="checkmark" loading={busy} onPress={() => onApprove(item)} style={styles.button} /> : null}
        </View>
      </View>
    </View>
  );
});

/** Asks why: the uploader sees the reason */
function RejectSheet({ item, busy, onClose, onReject }: { item: ApiMedia; busy: boolean; onClose: () => void; onReject: (reason: string) => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!reason.trim()) {
      setError(t('Please write a reason.'));
      return;
    }
    onReject(reason.trim());
  };

  return (
    <ModalSheet visible animationType="slide" onClose={onClose} style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.sheetTitle}>{t(item.status === 'approved' ? 'Take Down' : 'Reject')}</Text>
        <FormField label="Reason" error={error || undefined}>
          <TextAreaField
            placeholder="The uploader will see this"
            maxLength={MAX_REASON}
            minHeight={100}
            value={reason}
            onChangeText={(v) => {
              setReason(v);
              setError('');
            }}
          />
        </FormField>
        <View style={styles.buttons}>
          <OutlineButton title="Cancel" onPress={onClose} style={styles.button} />
          <PrimaryButton title="Reject" onPress={submit} loading={busy} style={styles.button} />
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = themedStyles(() => ({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  tabs: { marginTop: 14, marginBottom: 14 },
  loading: { marginVertical: 24 },
  separator: { height: 12 },
  card: { ...surface, overflow: 'hidden' },
  image: { width: '100%', height: IMAGE_HEIGHT, backgroundColor: colors.border },
  noPreview: { backgroundColor: colors.sand },
  play: {
    position: 'absolute',
    top: IMAGE_HEIGHT / 2 - 24,
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: 12, gap: 4 },
  caption: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 19, color: colors.textDark },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  reason: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  button: { flex: 1, width: 'auto' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '90%' },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.textDark, marginBottom: 12 },
}));
