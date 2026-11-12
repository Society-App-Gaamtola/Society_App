import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, radius, spacing } from '../theme';
import { getEvent, toSocietyEvent } from '../api/user';
import { Ionicons } from '../icons';
import type { SocietyEvent } from '../types';
import { AppHeader, StatusBadge } from '../components';

// Basic layout until the event details screen is designed.
export default function EventDetailsScreen() {
  const { params } = useRoute<RouteProp<HomeStackParamList, 'EventDetails'>>();
  // A list that opened this screen passes the event, so it shows at once; the API copy replaces it.
  const [event, setEvent] = useState<SocietyEvent | null>(params.event ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getEvent(params.eventId)
      .then(({ data }) => active && setEvent(toSocietyEvent(data.event)))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load the event.'));
    return () => {
      active = false;
    };
  }, [params.eventId]);

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['more']} />
      {event ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={event.image} style={styles.image} />
          <StatusBadge status={event.status} />
          <Text style={styles.title}>{event.title}</Text>
          {(
            [
              ['calendar-outline', event.days ? `${event.date} (${event.days})` : event.date],
              ['time-outline', event.time],
              ['location-outline', event.venue],
              ['pricetag-outline', event.category],
            ] as const
          )
            .filter(([, text]) => !!text)
            .map(([icon, text]) => (
              <View key={icon} style={styles.row}>
                <Ionicons name={icon} size={16} color={colors.primary} />
                <Text style={styles.meta}>{text}</Text>
              </View>
            ))}
          <Text style={styles.desc}>{event.description}</Text>
        </ScrollView>
      ) : error ? (
        <Text style={styles.missing}>{error}</Text>
      ) : (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: 10 },
  image: { width: '100%', height: 200, borderRadius: radius.image },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },
  desc: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textMuted, marginTop: 6 },
  missing: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  loading: { marginTop: 40 },
});
