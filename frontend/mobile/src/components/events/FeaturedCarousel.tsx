import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { colors, fonts } from '../../theme';
import { Ionicons } from '../../icons';
import type { SocietyEvent } from '../../types';

const BANNER_HEIGHT = 180;
const AUTO_SLIDE_MS = 4000;
const OVERLAY = ['rgba(20,8,4,0.85)', 'rgba(20,8,4,0.45)', 'rgba(20,8,4,0)'] as const;

type Props = {
  items: SocietyEvent[];
  onOpen: (id: string) => void;
  /** The screen padding around the carousel. */
  horizontalPadding?: number;
};

/** Auto-sliding featured events banner. */
export default function FeaturedCarousel({ items, onOpen, horizontalPadding = 16 }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = width - horizontalPadding * 2;
  const listRef = useRef<FlatList<SocietyEvent>>(null);
  const [index, setIndex] = useState(0);
  const isFocused = useIsFocused();

  // Restart the timer whenever the slide changes, so a manual swipe gets a full 4s too.
  // Stops while another screen is on top, so a hidden carousel does not keep working.
  useEffect(() => {
    if (items.length < 2 || !isFocused) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % items.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }, AUTO_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, items.length, isFocused]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
  };

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: cardWidth, offset: cardWidth * i, index: i }),
    [cardWidth],
  );

  const renderItem = useCallback(
    ({ item }: { item: SocietyEvent }) => <Banner event={item} width={cardWidth} onOpen={onOpen} />,
    [cardWidth, onOpen],
  );

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
        getItemLayout={getItemLayout}
        renderItem={renderItem}
      />
      <View style={styles.dots} pointerEvents="none">
        {items.map((e, i) => (
          <View key={e.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const Banner = memo(function Banner({ event, width, onOpen }: { event: SocietyEvent; width: number; onOpen: (id: string) => void }) {
  return (
    <View style={[styles.banner, { width }]}>
      <Image source={event.image} style={styles.image} resizeMode="cover" />
      <LinearGradient colors={OVERLAY} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={13} color={colors.white} />
          <Text style={styles.meta}>{event.date}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color={colors.white} />
          <Text style={styles.meta}>{event.venue}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => onOpen(event.id)}>
          <Text style={styles.buttonText}>View Details →</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  carousel: { marginTop: 16, height: BANNER_HEIGHT, borderRadius: 14, overflow: 'hidden' },
  banner: { height: BANNER_HEIGHT },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 4 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.white, maxWidth: '70%', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.white },
  button: {
    alignSelf: 'flex-start',
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: colors.white },
});
