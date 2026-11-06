import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { surface } from '../../styles/common';
import { colors, fonts } from '../../theme';
import { Ionicons } from '../../icons';
import type { SocietyEvent } from '../../types';
import MetaRow from '../ui/MetaRow';
import StatusBadge from '../ui/StatusBadge';

export default function EventListCard({ event, onPress }: { event: SocietyEvent; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <Image source={event.image} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <MetaRow icon="calendar-outline" text={event.date} />
        <MetaRow icon="location-outline" text={event.venue} />
      </View>
      <View style={styles.right}>
        <StatusBadge status={event.status} />
        <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  image: { width: 64, height: 64, borderRadius: 8 },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
});
