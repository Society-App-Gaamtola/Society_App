import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import type { SocietyEvent } from '../data/mock';
import StatusBadge from './StatusBadge';

const BANNER_HEIGHT = 180;
const AUTO_SLIDE_MS = 4000;
const MUTED_ICON = '#9A8F86';

export function SectionHeader({
  title,
  onViewAll,
  icon,
  style,
}: {
  title: string;
  onViewAll?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionTitleRow}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onViewAll ? (
        <Pressable onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAll}>View All →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Auto-sliding featured events banner. `horizontalPadding` is the screen padding around it. */
export function FeaturedCarousel({
  items,
  onOpen,
  horizontalPadding = 16,
}: {
  items: SocietyEvent[];
  onOpen: (id: string) => void;
  horizontalPadding?: number;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width - horizontalPadding * 2;
  const listRef = useRef<FlatList<SocietyEvent>>(null);
  const [index, setIndex] = useState(0);

  // Restart the timer whenever the slide changes, so a manual swipe gets a full 4s too.
  useEffect(() => {
    if (items.length < 2) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % items.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }, AUTO_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, items.length]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
  };

  return (
    <View style={styles.carousel}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(e) => e.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: cardWidth, offset: cardWidth * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.banner, { width: cardWidth }]}>
            <Image source={item.image} style={styles.bannerImage} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(20,8,4,0.85)', 'rgba(20,8,4,0.45)', 'rgba(20,8,4,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.bannerOverlay}
            >
              <Text style={styles.bannerTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.bannerRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.white} />
                <Text style={styles.bannerMeta}>{item.date}</Text>
              </View>
              <View style={styles.bannerRow}>
                <Ionicons name="location-outline" size={13} color={colors.white} />
                <Text style={styles.bannerMeta}>{item.venue}</Text>
              </View>
              <Pressable style={styles.bannerButton} onPress={() => onOpen(item.id)}>
                <Text style={styles.bannerButtonText}>View Details →</Text>
              </Pressable>
            </LinearGradient>
          </View>
        )}
      />
      <View style={styles.dots} pointerEvents="none">
        {items.map((e, i) => (
          <View key={e.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

export function EventListCard({ event, onPress }: { event: SocietyEvent; onPress: () => void }) {
  return (
    <Pressable style={styles.eventCard} onPress={onPress} accessibilityRole="button">
      <Image source={event.image} style={styles.eventImage} />
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.date}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.venue}
          </Text>
        </View>
      </View>
      <View style={styles.eventRight}>
        <StatusBadge status={event.status} />
        <Ionicons name="chevron-forward" size={18} color={MUTED_ICON} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark },
  viewAll: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },

  carousel: { marginTop: 16, height: BANNER_HEIGHT, borderRadius: 14, overflow: 'hidden' },
  banner: { height: BANNER_HEIGHT },
  bannerImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  bannerOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 4 },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.white, maxWidth: '70%', marginBottom: 2 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.white },
  bannerButton: {
    alignSelf: 'flex-start',
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    marginTop: 8,
  },
  bannerButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: colors.white },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventImage: { width: 64, height: 64, borderRadius: 8 },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  eventRight: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' },
});
