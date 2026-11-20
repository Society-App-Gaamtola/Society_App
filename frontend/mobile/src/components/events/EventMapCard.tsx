import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, fonts, radius, themedStyles } from '../../theme';
import { Ionicons } from '../../icons';
import OutlineButton from '../ui/OutlineButton';
import { useT } from '../../i18n';

type Props = {
  /** Venue pin. Without it only the "Open in Google Maps" button is shown. */
  coords?: { latitude: number; longitude: number } | null;
  venueName: string;
  address?: string | null;
  /** A link the event creator pasted (Google Maps share link); used when there is no pin. */
  mapLink?: string | null;
};

// How much area the preview shows around the pin (about 1 km)
const DELTA = 0.01;

/** Google Maps link for the pin (opens the Google Maps app when installed), or a search for the venue. */
export const googleMapsUrl = ({ coords, venueName, address, mapLink }: Props) => {
  if (coords) return `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
  if (mapLink) return mapLink;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venueName, address].filter(Boolean).join(', '))}`;
};

/**
 * Small map preview of the venue with a pin. Tapping it opens Google Maps at that location.
 * The map itself doesn't scroll or zoom, so the screen scrolls normally over it.
 */
export default function EventMapCard(props: Props) {
  const t = useT();
  const open = () => Linking.openURL(googleMapsUrl(props)).catch(() => {});

  if (!props.coords) {
    return <OutlineButton title="Open in Google Maps" icon="map-outline" onPress={open} />;
  }

  const region = { ...props.coords, latitudeDelta: DELTA, longitudeDelta: DELTA };
  return (
    <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={`Open ${props.venueName} in Google Maps`} style={styles.card}>
      <View pointerEvents="none">
        <MapView
          style={styles.map}
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          // A static image of the map on Android: lighter in a scrolling screen
          liteMode={Platform.OS === 'android'}
        >
          <Marker coordinate={props.coords} title={props.venueName} />
        </MapView>
      </View>
      <View style={styles.footer}>
        <Ionicons name="navigate-outline" size={16} color={colors.primary} />
        <Text style={styles.footerText} numberOfLines={1}>
          {props.address ? `${props.venueName}, ${props.address}` : props.venueName}
        </Text>
        <Text style={styles.open}>{t('Open in Google Maps')}</Text>
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  card: { borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  map: { width: '100%', height: 170 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  footerText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textDark },
  open: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
}));
