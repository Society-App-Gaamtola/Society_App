import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme';
import { SOCIETY_NAME } from '../config';
import { getHome, toNotice, toSocietyEvent } from '../api/user';
import type { Notice, SocietyEvent } from '../types';
import { Ionicons, MaterialCommunityIcons, type IoniconName } from '../icons';
import { AppHeader, EmptyState, EventListCard, FeaturedCarousel, IconCircle, SectionHeader, StatusBadge } from '../components';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Home = { hero: SocietyEvent[]; upcoming: SocietyEvent[]; notices: Notice[] };

const H_PADDING = 16;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0];
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Read inside openEvent, so the carousel's memoised slides don't re-render on every reload
  const homeRef = useRef<Home | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getHome();
      const next = {
        hero: data.hero_events.map(toSocietyEvent),
        upcoming: data.upcoming_events.map(toSocietyEvent),
        notices: data.latest_notices.map(toNotice),
      };
      homeRef.current = next;
      setHome(next);
      setError(null);
    } catch (e) {
      // What was loaded before stays on screen; the API client already handles expired logins.
      setError(e instanceof Error ? e.message : 'Could not load the home page.');
    }
  }, []);

  // Reload whenever the tab opens, so new events and notices show up without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openEvent = useCallback(
    (eventId: string) => {
      const loaded = homeRef.current;
      const event = [...(loaded?.hero ?? []), ...(loaded?.upcoming ?? [])].find((e) => e.id === eventId);
      navigation.navigate('EventDetails', { eventId, event });
    },
    [navigation],
  );
  const goToEvents = () => navigation.navigate('Events', { screen: 'EventsMain' });

  const shortcuts: { label: string; icon: IoniconName; onPress: () => void }[] = [
    { label: 'Events', icon: 'calendar-outline', onPress: goToEvents },
    { label: 'Notices', icon: 'megaphone-outline', onPress: () => navigation.navigate('NoticeBoard') },
    { label: 'Gallery', icon: 'images-outline', onPress: () => navigation.navigate('Gallery') },
    { label: 'Donate', icon: 'heart-outline', onPress: () => navigation.navigate('Donate') },
    { label: 'Members', icon: 'people-outline', onPress: () => navigation.navigate('MemberDirectory') },
  ];

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <Text style={styles.greeting}>{`Namaste${firstName ? `, ${firstName}` : ''} 👋`}</Text>
        <Text style={styles.welcome}>{`Welcome to ${SOCIETY_NAME}`}</Text>

        {home && home.hero.length > 0 ? (
          <FeaturedCarousel items={home.hero} onOpen={openEvent} horizontalPadding={H_PADDING} />
        ) : null}

        <View style={styles.shortcuts}>
          {shortcuts.map((s) => (
            <Pressable key={s.label} style={styles.shortcut} onPress={s.onPress} accessibilityRole="button">
              <IconCircle size={48} radius={12}>
                <Ionicons name={s.icon} size={22} color={colors.primary} />
              </IconCircle>
              <Text style={styles.shortcutLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {!home && !error ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : null}

        {!home && error ? (
          <EmptyState
            icon={<Ionicons name="cloud-offline-outline" size={40} color={colors.lightGold} />}
            text="Couldn't load. Pull down to try again."
          />
        ) : null}

        {home ? (
          <>
            <SectionHeader title="Upcoming Events" onViewAll={goToEvents} />
            <View style={styles.list}>
              {home.upcoming.map((event) => (
                <EventListCard key={event.id} event={event} onPress={() => openEvent(event.id)} />
              ))}
              {home.upcoming.length === 0 ? <Text style={styles.empty}>No upcoming events right now.</Text> : null}
            </View>

            <SectionHeader title="Latest Notices" onViewAll={() => navigation.navigate('NoticeBoard')} />
            <View style={styles.list}>
              {home.notices.map((notice) => (
                <Pressable
                  key={notice.id}
                  style={styles.noticeCard}
                  onPress={() => navigation.navigate('NoticeDetails', { noticeId: notice.id, notice })}
                >
                  <IconCircle size={40}>
                    <Ionicons name={notice.icon} size={20} color={colors.primary} />
                  </IconCircle>
                  <View style={styles.noticeInfo}>
                    <Text style={styles.noticeTitle}>{notice.title}</Text>
                    <Text style={styles.noticeDate}>{notice.date}</Text>
                    <Text style={styles.noticeDesc} numberOfLines={2}>
                      {notice.description}
                    </Text>
                  </View>
                  <StatusBadge status={notice.tag} style={styles.noticeBadge} />
                </Pressable>
              ))}
              {home.notices.length === 0 ? <Text style={styles.empty}>No notices yet.</Text> : null}
            </View>
          </>
        ) : null}

        <View style={styles.donate}>
          <MaterialCommunityIcons name="hand-heart-outline" size={30} color={colors.primary} />
          <View style={styles.donateText}>
            <Text style={styles.donateTitle}>Contribute to Society Activities</Text>
            <Text style={styles.donateSub}>Your support helps us organize better events.</Text>
          </View>
          <Pressable style={styles.donateButton} onPress={() => navigation.navigate('Donate')}>
            <Text style={styles.donateButtonText}>Donate Now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: H_PADDING, paddingTop: 16, paddingBottom: 32 },
  greeting: { fontFamily: fonts.bold, fontSize: 20, color: colors.textDark },
  welcome: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  shortcut: { flex: 1, alignItems: 'center', gap: 6 },
  shortcutLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDark },

  list: { gap: 10 },
  loading: { marginTop: 40 },
  empty: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },

  noticeCard: { ...surface, flexDirection: 'row', gap: 10, padding: 12 },
  noticeInfo: { flex: 1, gap: 2, paddingRight: 64 },
  noticeTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  noticeDate: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  noticeDesc: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  noticeBadge: { position: 'absolute', top: 12, right: 12 },

  donate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDEFE3',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  donateText: { flex: 1 },
  donateTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  donateSub: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  donateButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  donateButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
});
