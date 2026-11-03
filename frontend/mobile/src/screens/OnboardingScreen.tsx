import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius, spacing } from '../theme';
import Loader from '../components/Loader';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

type Slide = { key: string; image: ImageSourcePropType; title: string; description: string };

const slides: Slide[] = [
  {
    key: 'community',
    image: require('../../assets/arti1.png'),
    title: 'Stay Connected with Our Community',
    description:
      'Explore cultural programmes, Aarti schedules, festivals and upcoming community events in one place.',
  },
  {
    key: 'festivals',
    image: require('../../assets/Ganesh Chaturthi Puja at Night2.png'),
    title: 'Celebrate Every Festival Together',
    description:
      'Get event reminders, RSVP for Garba, Ganesh Chaturthi and more, and never miss a celebration.',
  },
  {
    key: 'donate',
    image: require('../../assets/Diwali Courtyard Celebration3.png'),
    title: 'Donate & Share Memories',
    description:
      'Contribute to society activities via UPI and share photos and videos with the community.',
  },
];

const HORIZONTAL_PADDING = spacing.lg;
const INACTIVE_DOT = '#D9CBB8';
const LOADER_MS = 700;

export default function OnboardingScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const isLast = index === slides.length - 1;

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => navigation.replace('LanguageSelect'), LOADER_MS);
    return () => clearTimeout(timer);
  }, [leaving, navigation]);

  const goToLanguageSelect = () => setLeaving(true);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const onNext = () => {
    if (isLast) return goToLanguageSelect();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goToLanguageSelect} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image source={item.image} style={[styles.image, { height: height * 0.45 }]} resizeMode="cover" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {slides.map((s, i) => (
          <View key={s.key} style={[styles.dot, { backgroundColor: i === index ? colors.primary : INACTIVE_DOT }]} />
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onNext}
      >
        <Text style={styles.buttonText}>{isLast ? 'Get Started →' : 'Next →'}</Text>
      </Pressable>
      <Loader overlay visible={leaving} message="Loading..." language="en" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: spacing.sm,
  },
  skip: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark },
  slide: { paddingHorizontal: HORIZONTAL_PADDING },
  image: { width: '100%', borderRadius: radius.image, marginTop: spacing.sm },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 26,
    lineHeight: 36,
    color: colors.primary,
    marginTop: spacing.lg,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  button: {
    height: 52,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: spacing.md,
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.white },
});
