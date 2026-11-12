import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common } from '../styles/common';
import { colors, fonts, tones } from '../theme';
import { galleryPhotos } from '../data/mock';
import { Ionicons } from '../icons';
import type { EventCategory, GalleryPhoto } from '../types';
import { formatDate } from '../utils/date';
import { createId } from '../utils/format';
import { AppHeader, EmptyState, FilterChips, Pill, PrimaryButton } from '../components';

const FILTERS = ['All', 'Festival', 'Aarti', 'Cultural', 'Meeting'] as const;
type Filter = (typeof FILTERS)[number];

const COLUMNS = 2;
const GAP = 10;
const PADDING = 16;

// Sample photos until the media API exists. New uploads wait for Super Admin approval (shown as "Pending").
export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tile = (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const [photos, setPhotos] = useState<GalleryPhoto[]>(galleryPhotos);
  const [filter, setFilter] = useState<Filter>('All');
  const [viewing, setViewing] = useState<GalleryPhoto | null>(null);

  const data = useMemo(() => (filter === 'All' ? photos : photos.filter((p) => p.category === filter)), [photos, filter]);

  const upload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const photo: GalleryPhoto = {
      id: createId('g'),
      image: { uri: result.assets[0].uri },
      caption: 'My photo',
      category: (filter === 'All' ? 'Festival' : filter) as EventCategory,
      date: formatDate(new Date()),
      pending: true,
    };
    setPhotos((list) => [photo, ...list]);
    Alert.alert('Photo Uploaded', 'Your photo will appear for everyone after the admin approves it.');
  };

  const renderItem = useCallback(
    ({ item }: { item: GalleryPhoto }) => <Tile photo={item} size={tile} onOpen={setViewing} />,
    [tile],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        initialNumToRender={8}
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>Gallery</Text>
            <Text style={common.subtextRelaxed}>Photos from our events and celebrations.</Text>
            <PrimaryButton title="Upload Photo" icon="cloud-upload-outline" onPress={upload} style={styles.upload} />
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon={<Ionicons name="images-outline" size={40} color={colors.lightGold} />} text="No photos yet" />
        }
        renderItem={renderItem}
      />

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.close} onPress={() => setViewing(null)} hitSlop={10} accessibilityLabel="Close photo">
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
          {viewing ? (
            <>
              <Image source={viewing.image} style={styles.full} resizeMode="contain" />
              <Text style={styles.viewerCaption}>{viewing.caption}</Text>
              <Text style={styles.viewerMeta}>{`${viewing.category} · ${viewing.date}`}</Text>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const Tile = memo(function Tile({ photo, size, onOpen }: { photo: GalleryPhoto; size: number; onOpen: (p: GalleryPhoto) => void }) {
  return (
    <Pressable style={{ width: size }} onPress={() => onOpen(photo)} accessibilityRole="imagebutton" accessibilityLabel={photo.caption}>
      <Image source={photo.image} style={[styles.image, { width: size, height: size }]} />
      {photo.pending ? <Pill label="Pending" tone={tones.warning} style={styles.pending} /> : null}
      <Text style={styles.caption} numberOfLines={1}>
        {photo.caption}
      </Text>
      <Text style={styles.date}>{photo.date}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { padding: PADDING, paddingBottom: 32, flexGrow: 1 },
  row: { gap: GAP, marginBottom: 14 },
  upload: { marginTop: 14 },
  chips: { marginTop: 14, marginBottom: 14 },
  image: { borderRadius: 12, backgroundColor: colors.border },
  pending: { position: 'absolute', top: 8, left: 8 },
  caption: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, marginTop: 6 },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingHorizontal: 16 },
  close: { alignSelf: 'flex-end', padding: 4 },
  full: { flex: 1, width: '100%' },
  viewerCaption: { fontFamily: fonts.bold, fontSize: 16, color: colors.white, textAlign: 'center', marginTop: 12 },
  viewerMeta: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4 },
});
