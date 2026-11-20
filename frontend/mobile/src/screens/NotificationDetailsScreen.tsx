import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { Ionicons } from '../icons';
import { AppHeader, IconCircle, PrimaryButton } from '../components';
import { useT } from '../i18n';

type Nav = NativeStackNavigationProp<HomeStackParamList & MainTabParamList>;

export default function NotificationDetailsScreen() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const { notification: n } = useRoute<RouteProp<HomeStackParamList, 'NotificationDetails'>>().params;

  // The event / notice / gallery item the notification is about (loaded fresh by its own screen)
  const target =
    n.refType === 'event' && n.refId
      ? { title: 'View Event', icon: 'calendar-outline' as const, go: () => navigation.navigate('EventDetails', { eventId: n.refId! }) }
      : n.refType === 'notice' && n.refId
        ? { title: 'View Notice', icon: 'document-text-outline' as const, go: () => navigation.navigate('NoticeDetails', { noticeId: n.refId! }) }
        : n.refType === 'media'
          ? { title: 'Open Gallery', icon: 'images-outline' as const, go: () => navigation.navigate('Gallery') }
          : null;

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <View style={styles.band}>
        <Text style={styles.bandTitle}>{t('Notification Details')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <IconCircle size={64} color={colors.primary}>
            <Ionicons name={n.icon} size={30} color={colors.white} />
          </IconCircle>
          <Text style={styles.title}>{n.title}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.time}>{n.time}</Text>
          </View>
        </View>

        {n.message ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>{n.message}</Text>
          </View>
        ) : null}

        {target ? <PrimaryButton title={target.title} icon={target.icon} onPress={target.go} /> : null}

        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => navigation.navigate('Settings')} accessibilityRole="button">
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <View style={common.flex}>
              <Text style={styles.settingTitle}>{t('Notification preferences')}</Text>
              <Text style={styles.settingSub}>{t('Manage your notification settings')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  band: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 12 },
  bandTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.primary, textAlign: 'center', marginTop: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  message: { backgroundColor: colors.noteBackground, borderRadius: 12, padding: 14 },
  messageText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textDark },
  card: { ...surface, padding: 12, gap: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  settingSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
}));
