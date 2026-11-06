import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme';
import { events, featuredEvents, notices } from '../data/mock';
import { Ionicons, MaterialCommunityIcons, type IoniconName } from '../icons';
import { AppHeader, EventListCard, FeaturedCarousel, IconCircle, SectionHeader, StatusBadge } from '../components';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

const H_PADDING = 16;

const upcoming = events.filter((e) => e.status === 'Upcoming').slice(0, 3);
const latestNotice = notices[0];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0];
  const openEvent = useCallback((eventId: string) => navigation.navigate('EventDetails', { eventId }), [navigation]);
  const goToEvents = () => navigation.navigate('Events', { screen: 'EventsMain' });

  const shortcuts: { label: string; icon: IoniconName; onPress: () => void }[] = [
    { label: 'Events', icon: 'calendar-outline', onPress: goToEvents },
    { label: 'Notices', icon: 'megaphone-outline', onPress: () => navigation.navigate('NoticeBoard') },
    { label: 'Gallery', icon: 'images-outline', onPress: () => navigation.navigate('Gallery') },
    { label: 'Donate', icon: 'heart-outline', onPress: () => navigation.navigate('Donate') },
    { label: 'Members', icon: 'people-outline', onPress: () => Alert.alert('Members', 'Coming soon.') },
  ];

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{`Namaste${firstName ? `, ${firstName}` : ''} 👋`}</Text>
        <Text style={styles.welcome}>Welcome to Shri Gamtola Yuvak Mitra Mandal</Text>

        <FeaturedCarousel items={featuredEvents} onOpen={openEvent} horizontalPadding={H_PADDING} />

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

        <SectionHeader title="Upcoming Events" onViewAll={goToEvents} />
        <View style={styles.list}>
          {upcoming.map((event) => (
            <EventListCard key={event.id} event={event} onPress={() => openEvent(event.id)} />
          ))}
        </View>

        <SectionHeader title="Latest Notices" onViewAll={() => navigation.navigate('NoticeBoard')} />
        <Pressable style={styles.noticeCard} onPress={() => navigation.navigate('NoticeBoard')}>
          <IconCircle size={40}>
            <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
          </IconCircle>
          <View style={styles.noticeInfo}>
            <Text style={styles.noticeTitle}>{latestNotice.title}</Text>
            <Text style={styles.noticeDate}>{latestNotice.date}</Text>
            <Text style={styles.noticeDesc} numberOfLines={2}>
              {latestNotice.description}
            </Text>
          </View>
          <StatusBadge status={latestNotice.tag} style={styles.noticeBadge} />
        </Pressable>

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
