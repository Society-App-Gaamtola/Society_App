import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts, radius, spacing } from '../theme';
import { events } from '../data/mock';
import { AppHeader, StatusBadge } from '../components';

// Basic layout until the event details screen is designed.
export default function EventDetailsScreen() {
  const { params } = useRoute<RouteProp<HomeStackParamList, 'EventDetails'>>();
  const event = events.find((e) => e.id === params.eventId);

  return (
    <View style={styles.container}>
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
              ['people-outline', event.organizer],
              ['call-outline', event.contact],
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
      ) : (
        <Text style={styles.missing}>Event not found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: 10 },
  image: { width: '100%', height: 200, borderRadius: radius.image },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },
  desc: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textMuted, marginTop: 6 },
  missing: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
