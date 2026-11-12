import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { MEDIA } from '../config';
import { getEventCategories, type ApiCategory } from '../api/user';
import { getMedia, saveMedia, type ApiMedia } from '../api/media';
import { cdnImage, mediaFolder, uploadMedia } from '../services/media';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons } from '../icons';
import { formatDate } from '../utils/date';
import { ActionSheet, AppHeader, EmptyState, FilterChips, Pill, PrimaryButton } from '../components';

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
export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tile = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [filter, setFilter] = useState(ALL);
  const [viewing, setViewing] = useState<ApiMedia | null>(null);
  const [choosingCategory, setChoosingCategory] = useState<ImagePicker.ImagePickerAsset[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    getEventCategories()
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

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
        lastError = e instanceof Error ? e.message : 'Upload failed.';
      }
    }
    setProgress(null);
    refresh();

    const lines = [
      approved ? `${approved} added to the gallery.` : '',
      pending ? `${pending} will appear after the admin approves ${pending === 1 ? 'it' : 'them'}.` : '',
      failed ? `${failed} could not be uploaded: ${lastError}` : '',
    ].filter(Boolean);
    Alert.alert(failed && !approved && !pending ? 'Upload failed' : 'Upload complete', lines.join('\n'));
  };

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MEDIA.maxPick,
      quality: 1,
    });
    if (result.canceled || !result.assets.length) return;
    // Uploads go into the chosen category; with "All" selected, ask which one
    if (categoryId) uploadAll(result.assets, categoryId);
    else setChoosingCategory(result.assets);
  };

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
            <Text style={common.heading}>Gallery</Text>
            <Text style={common.subtextRelaxed}>Photos and videos from our events and celebrations.</Text>

            {progress ? (
              <View style={styles.progressCard}>
                <View style={styles.progressRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.progressText}>
                    {`Uploading ${progress.done + 1} of ${progress.total} · ${Math.round(overall * 100)}%`}
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
              {`Up to ${MEDIA.maxPick} at a time · photos are compressed · videos up to ${MEDIA.maxBytes.video / (1024 * 1024)}MB`}
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
            </>
          ) : null}
        </View>
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


const styles = StyleSheet.create({
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
});
