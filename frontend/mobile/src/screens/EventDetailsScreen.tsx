import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, radius, spacing, themedStyles } from '../theme';
import { getEvent, toSocietyEvent } from '../api/user';
import { getMedia, type ApiMedia } from '../api/media';
import { cdnImage } from '../services/media';
import { Ionicons } from '../icons';
import type { SocietyEvent } from '../types';
import { AppHeader, StatusBadge } from '../components';
// Not in components/index.ts: it loads the native map library, so only screens with a map import it
import EventMapCard from '../components/events/EventMapCard';
import { eventShareText, shareAnywhere, shareOnWhatsApp } from '../services/share';
import { useLanguage, useT } from '../i18n';

const IMAGE_HEIGHT = 220;
const PHOTO_SIZE = 96;
const MAX_PHOTOS = 20;

// Basic layout until the event details screen is designed.
export default function EventDetailsScreen() {
  const t = useT();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'EventDetails'>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slideWidth = width - spacing.md * 2;
  // A list that opened this screen passes the event, so it shows at once; the API copy replaces it.
  const [event, setEvent] = useState<SocietyEvent | null>(params.event ?? null);
  const [error, setError] = useState<string | null>(null);
  // Reloaded in the new language when the user switches it (category names, dates and server messages)
  const language = useLanguage();
  const [slide, setSlide] = useState(0);
  // Approved gallery photos members linked to this event (GET /user/media?event_id=)
  const [photos, setPhotos] = useState<ApiMedia[]>([]);
  // Full-screen view of an event image or a gallery photo
  const [viewing, setViewing] = useState<{ url: string; caption?: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    getEvent(params.eventId)
      .then(({ data }) => active && setEvent(toSocietyEvent(data.event)))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load the event.'));
    // Photos are extra: if they fail to load, the event still shows
    getMedia(1, { event_id: Number(params.eventId), limit: MAX_PHOTOS })
      .then(({ data }) => active && setPhotos(data.media.filter((m) => m.media_type === 'photo' && m.status === 'approved')))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [params.eventId, language]);

  const call = (number: string) => Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() => {});
  const onSlide = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setSlide(Math.round(e.nativeEvent.contentOffset.x / slideWidth));

  const images = event?.images ?? [];

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['more']} />
      {event ? (
        <ScrollView contentContainerStyle={styles.content}>
          {images.length ? (
            <View>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onSlide} style={styles.carousel}>
                {images.map((url, i) => (
                  <Pressable key={url} onPress={() => setViewing({ url })} accessibilityRole="imagebutton" accessibilityLabel={`Event image ${i + 1} of ${images.length}`}>
                    <Image source={{ uri: cdnImage(url, slideWidth * 2) ?? url }} style={[styles.image, { width: slideWidth }]} />
                  </Pressable>
                ))}
              </ScrollView>
              {images.length > 1 ? (
                <View style={styles.dots}>
                  {images.map((url, i) => (
                    <View key={url} style={[styles.dot, i === slide && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <Image source={event.image} style={styles.image} />
          )}

          <StatusBadge status={event.status} />
          <Text style={styles.title}>{event.title}</Text>
          {(
            [
              ['calendar-outline', event.days ? `${event.date} (${event.days})` : event.date],
              ['time-outline', event.time],
              ['location-outline', event.venue],
              ['pricetag-outline', event.category],
              ['people-outline', event.organizer],
            ] as const
          )
            .filter(([, text]) => !!text)
            .map(([icon, text]) => (
              <View key={icon} style={styles.row}>
                <Ionicons name={icon} size={16} color={colors.primary} />
                <Text style={styles.meta}>{text}</Text>
              </View>
            ))}
          {event.contact ? (
            <Pressable style={styles.row} onPress={() => call(event.contact!)} accessibilityRole="link" accessibilityLabel={`Call ${event.contact}`}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={[styles.meta, styles.link]}>{event.contact}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.desc}>{event.description}</Text>

          <Text style={styles.section}>{t('Location')}</Text>
          <EventMapCard coords={event.coords} venueName={event.venueName ?? event.venue} address={event.address} mapLink={event.mapLink} />

          <View style={styles.shareRow}>
            <Pressable
              style={({ pressed }) => [styles.whatsapp, pressed && styles.pressed]}
              onPress={() => shareOnWhatsApp(eventShareText(event))}
              accessibilityRole="button"
            >
              <Ionicons name="logo-whatsapp" size={18} color={colors.white} />
              <Text style={styles.whatsappText}>{t('Share on WhatsApp')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.shareMore, pressed && styles.pressed]}
              onPress={() => shareAnywhere(eventShareText(event))}
              accessibilityRole="button"
              accessibilityLabel={t('Share')}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>

          {photos.length ? (
            <View style={styles.photos}>
              <Text style={styles.section}>{t('Photos from this event')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {photos.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setViewing({ url: p.media_url, caption: p.caption })}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={p.caption || 'Event photo'}
                  >
                    <Image source={{ uri: cdnImage(p.media_url, PHOTO_SIZE * 2) ?? undefined }} style={styles.photo} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
      ) : error ? (
        <Text style={styles.missing}>{t(error)}</Text>
      ) : (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      )}

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.close} onPress={() => setViewing(null)} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
          {viewing ? (
            <>
              <Image source={{ uri: cdnImage(viewing.url, Math.min(width * 2, 1600)) ?? viewing.url }} style={styles.full} resizeMode="contain" />
              {viewing.caption ? <Text style={styles.viewerCaption}>{viewing.caption}</Text> : null}
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { padding: spacing.md, gap: 10, paddingBottom: spacing.xl },
  shareRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  whatsapp: { flex: 1, height: 46, borderRadius: 10, backgroundColor: colors.whatsapp, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  whatsappText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.white },
  shareMore: { width: 46, height: 46, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  carousel: { borderRadius: radius.image },
  image: { width: '100%', height: IMAGE_HEIGHT, borderRadius: radius.image, backgroundColor: colors.border },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lightGold },
  dotActive: { width: 16, backgroundColor: colors.primary },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  desc: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textMuted, marginTop: 6 },
  section: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, marginTop: 8 },
  photos: { gap: 8 },
  photoRow: { gap: 8 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: radius.card, backgroundColor: colors.border },
  missing: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  loading: { marginTop: 40 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingHorizontal: 16 },
  close: { alignSelf: 'flex-end', padding: 4 },
  full: { flex: 1, width: '100%' },
  viewerCaption: { fontFamily: fonts.bold, fontSize: 16, color: colors.white, textAlign: 'center', marginTop: 12 },
}));
