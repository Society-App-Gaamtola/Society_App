import { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common } from '../styles/common';
import { colors, fonts, tones, themedStyles } from '../theme';
import { MEDIA } from '../config';
import { getEventCategories, type ApiCategory } from '../api/user';
import { deleteMedia, editMedia, getMedia, saveMedia, type ApiMedia } from '../api/media';
import { useAuth } from '../context/AuthContext';
import { cdnImage, mediaFolder, uploadMedia } from '../services/media';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons } from '../icons';
import { formatDate } from '../utils/date';
import { ActionSheet, AppHeader, EmptyState, FieldLabel, FilterChips, InputField, OutlineButton, Pill, PrimaryButton } from '../components';
import { useLanguage, useT } from '../i18n';

const ALL = 'All';
const COLUMNS = 2;
const GAP = 10;
const PADDING = 16;

type Progress = { done: number; total: number; fraction: number; failed: number };

/** Plays a gallery video full screen; only mounted while a video is open. */
function VideoViewer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => p.play());
  return <VideoView player={player} style={styles.full} nativeControls contentFit="contain" />;
}

// The app uploads photos and videos to Cloudinary (society_app/<env>/gallery/<yyyy>/<mm>); the backend stores their links.
// Members' uploads wait for the Super Admin's approval and are shown to them with a "Pending" badge.
// The uploader can edit the caption / category of their own items (a member's edit is reviewed again) or delete them.
export default function GalleryScreen() {
  // Reloaded in the new language when the user switches it (category names, dates and server messages)
  const language = useLanguage();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tile = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [filter, setFilter] = useState(ALL);
  const [viewing, setViewing] = useState<ApiMedia | null>(null);
  const [choosingCategory, setChoosingCategory] = useState<ImagePicker.ImagePickerAsset[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const { user } = useAuth();
  // Edit sheet for one of the user's own items
  const [editing, setEditing] = useState<ApiMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEventCategories()
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, [language]);

  const categoryId = categories.find((c) => c.name === filter)?.id;
  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getMedia(page, { category_id: categoryId });
      return { items: data.media, pagination: data.pagination };
    },
    [categoryId],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  // One file at a time, so a slow connection isn't shared between several big uploads
  const uploadAll = async (assets: ImagePicker.ImagePickerAsset[], category_id: number) => {
    let approved = 0;
    let pending = 0;
    let failed = 0;
    let lastError = '';
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      setProgress({ done: i, total: assets.length, fraction: 0, failed });
      try {
        const uploaded = await uploadMedia(
          { uri: asset.uri, kind: asset.type === 'video' ? 'video' : 'image', mimeType: asset.mimeType, fileSize: asset.fileSize },
          mediaFolder('gallery'),
          (fraction) => setProgress({ done: i, total: assets.length, fraction, failed }),
        );
        // The file is on Cloudinary now; the backend only stores its link
        const { data } = await saveMedia({
          media_url: uploaded.url,
          media_type: uploaded.kind === 'video' ? 'video' : 'photo',
          thumbnail_url: uploaded.thumbnailUrl,
          public_id: uploaded.publicId,
          file_size_bytes: uploaded.bytes,
          category_id,
        });
        if (data.media.status === 'approved') approved++;
        else pending++;
      } catch (e) {
        failed++;
        lastError = e instanceof Error ? t(e.message) : t('Upload failed.');
      }
    }
    setProgress(null);
    refresh();

    const lines = [
      approved ? t('{n} added to the gallery.', { n: approved }) : '',
      pending ? t('{n} will appear after the admin approves them.', { n: pending }) : '',
      failed ? t('{n} could not be uploaded: {error}', { n: failed, error: lastError }) : '',
    ].filter(Boolean);
    Alert.alert(t(failed && !approved && !pending ? 'Upload failed' : 'Upload complete'), lines.join('\n'));
  };

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MEDIA.maxPick,
      quality: 1,
      // iOS re-encodes picked videos to 720p H.264 before we upload them (often 5-10x smaller).
      // Android has no built-in video compression, so videos there are only checked against the size limit
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    });
    if (result.canceled || !result.assets.length) return;
    // Uploads go into the chosen category; with "All" selected, ask which one
    if (categoryId) uploadAll(result.assets, categoryId);
    else setChoosingCategory(result.assets);
  };

  const startEdit = (item: ApiMedia) => {
    setViewing(null);
    setCaption(item.caption ?? '');
    setEditCategoryId(item.category.id);
    setEditing(item);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { message } = await editMedia(editing.id, {
        caption: caption.trim(),
        ...(editCategoryId && editCategoryId !== editing.category.id ? { category_id: editCategoryId } : {}),
      });
      setEditing(null);
      refresh();
      Alert.alert(t('Saved'), message);
    } catch (e) {
      Alert.alert(t('Could not save'), e instanceof Error ? t(e.message) : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: ApiMedia) =>
    Alert.alert(t('Delete from the gallery?'), t('This photo or video will be removed for everyone.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMedia(item.id);
            setViewing(null);
            refresh();
          } catch (e) {
            Alert.alert(t('Could not delete'), e instanceof Error ? t(e.message) : t('Please try again.'));
          }
        },
      },
    ]);

  const renderItem = useCallback(
    ({ item }: { item: ApiMedia }) => <Tile item={item} size={tile} onOpen={setViewing} />,
    [tile],
  );

  const uploading = !!progress;
  const overall = progress ? (progress.done + progress.fraction) / progress.total : 0;

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <FlatList
        data={items}
        keyExtractor={(m) => String(m.id)}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        initialNumToRender={8}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>{t('Gallery')}</Text>
            <Text style={common.subtextRelaxed}>{t('Photos and videos from our events and celebrations.')}</Text>

            {progress ? (
              <View style={styles.progressCard}>
                <View style={styles.progressRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.progressText}>
                    {`${t('Uploading {done} of {total}', { done: progress.done + 1, total: progress.total })} · ${Math.round(overall * 100)}%`}
                  </Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${Math.round(overall * 100)}%` }]} />
                </View>
              </View>
            ) : (
              <PrimaryButton title="Upload Photos / Videos" icon="cloud-upload-outline" onPress={pick} style={styles.upload} />
            )}
            <Text style={styles.limits}>
              {t('Up to {n} at a time · photos are compressed · videos up to {mb}MB', { n: MEDIA.maxPick, mb: MEDIA.maxBytes.video / (1024 * 1024) })}
            </Text>

            <FilterChips options={[ALL, ...categories.map((c) => c.name)]} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'images-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load the gallery. Pull down to try again." : 'No photos yet. Be the first to upload!'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
        renderItem={renderItem}
      />

      <ActionSheet
        visible={!!choosingCategory && !uploading}
        title="Upload to which category?"
        actions={categories.map((c) => ({
          label: c.name,
          icon: 'pricetag-outline',
          onPress: () => {
            const assets = choosingCategory;
            setChoosingCategory(null);
            if (assets) uploadAll(assets, c.id);
          },
        }))}
        onClose={() => setChoosingCategory(null)}
      />

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.close} onPress={() => setViewing(null)} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
          {viewing ? (
            <>
              {viewing.media_type === 'video' ? (
                <VideoViewer url={viewing.media_url} />
              ) : (
                <Image source={{ uri: cdnImage(viewing.media_url, Math.min(width * 2, 1600)) ?? undefined }} style={styles.full} resizeMode="contain" />
              )}
              <Text style={styles.viewerCaption}>{viewing.caption || viewing.category.name}</Text>
              <Text style={styles.viewerMeta}>{`${viewing.uploaded_by_name || 'Member'} · ${formatDate(new Date(viewing.created_at))}`}</Text>
              {viewing.status === 'rejected' && viewing.rejection_reason ? (
                <Text style={styles.viewerReason}>{t('Not approved: {reason}', { reason: viewing.rejection_reason })}</Text>
              ) : null}
              {viewing.is_mine ? (
                <View style={styles.viewerActions}>
                  <Pressable style={styles.viewerAction} onPress={() => startEdit(viewing)} accessibilityRole="button">
                    <Ionicons name="create-outline" size={18} color={colors.white} />
                    <Text style={styles.viewerActionText}>{t('Edit')}</Text>
                  </Pressable>
                  <Pressable style={styles.viewerAction} onPress={() => confirmDelete(viewing)} accessibilityRole="button">
                    <Ionicons name="trash-outline" size={18} color={colors.white} />
                    <Text style={styles.viewerActionText}>{t('Delete')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </Modal>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.sheetWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setEditing(null)} />
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <Text style={styles.sheetTitle}>{t('Edit gallery item')}</Text>
            {user?.role === 'member' ? (
              <Text style={styles.sheetNote}>{t('The admin checks your changes again before they show in the gallery.')}</Text>
            ) : null}
            <FieldLabel text="Caption" required={false} />
            <InputField value={caption} onChangeText={setCaption} placeholder="e.g. Diwali aarti at the temple" maxLength={256} />
            <FieldLabel text="Category" style={styles.sheetLabel} />
            <FilterChips
              options={categories.map((c) => c.name)}
              selected={categories.find((c) => c.id === editCategoryId)?.name ?? ''}
              onSelect={(name) => setEditCategoryId(categories.find((c) => c.name === name)?.id ?? null)}
            />
            <View style={styles.sheetButtons}>
              <OutlineButton title="Cancel" onPress={() => setEditing(null)} style={common.flex} />
              <PrimaryButton title="Save" onPress={saveEdit} loading={saving} style={common.flex} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const Tile = memo(function Tile({ item, size, onOpen }: { item: ApiMedia; size: number; onOpen: (m: ApiMedia) => void }) {
  const video = item.media_type === 'video';
  const preview = cdnImage(video ? item.thumbnail_url : item.media_url, size * 2);
  return (
    <Pressable style={{ width: size }} onPress={() => onOpen(item)} accessibilityRole="imagebutton" accessibilityLabel={item.caption || item.category.name}>
      <Image source={preview ? { uri: preview } : undefined} style={[styles.image, { width: size, height: size }]} />
      {video ? (
        <View style={[styles.play, { width: size, height: size }]} pointerEvents="none">
          <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.92)" />
        </View>
      ) : null}
      {item.status !== 'approved' ? (
        <Pill label={item.status === 'pending' ? 'Pending' : 'Rejected'} tone={item.status === 'pending' ? tones.warning : tones.danger} style={styles.badge} />
      ) : null}
      <Text style={styles.caption} numberOfLines={1}>
        {item.caption || item.category.name}
      </Text>
      <Text style={styles.date}>{formatDate(new Date(item.created_at))}</Text>
    </Pressable>
  );
});


const styles = themedStyles(() => ({
  list: { padding: PADDING, paddingBottom: 32, flexGrow: 1 },
  row: { gap: GAP, marginBottom: 14 },
  upload: { marginTop: 14 },
  limits: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  chips: { marginTop: 14, marginBottom: 14 },
  loading: { marginVertical: 24 },
  progressCard: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.noteBackground, gap: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  image: { borderRadius: 12, backgroundColor: colors.border },
  play: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, left: 8 },
  caption: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, marginTop: 6 },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingHorizontal: 16 },
  close: { alignSelf: 'flex-end', padding: 4 },
  full: { flex: 1, width: '100%' },
  viewerCaption: { fontFamily: fonts.bold, fontSize: 16, color: colors.white, textAlign: 'center', marginTop: 12 },
  viewerMeta: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4 },
  viewerReason: { fontFamily: fonts.medium, fontSize: 13, color: tones.danger.bg, textAlign: 'center', marginTop: 8 },
  viewerActions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 14 },
  viewerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  viewerActionText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.white },
  sheetWrap: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 8 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark },
  sheetNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  sheetLabel: { marginTop: 8 },
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
}));
