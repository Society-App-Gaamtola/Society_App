import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { Ionicons, type IoniconName } from '../icons';
import { AppHeader, IconCircle, OutlineButton, PrimaryButton } from '../components';

type Nav = NativeStackNavigationProp<HomeStackParamList & MainTabParamList>;

function InfoRow({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function NotificationDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const { notification: n } = useRoute<RouteProp<HomeStackParamList, 'NotificationDetails'>>().params;
  // Sample setting until notification preferences are saved on the server.
  const [muted, setMuted] = useState(false);

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <View style={styles.band}>
        <Text style={styles.bandTitle}>Notification Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <IconCircle size={64} color={colors.primary}>
            <Ionicons name="notifications" size={30} color={colors.white} />
          </IconCircle>
          <Text style={styles.title}>{n.title}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.time}>{n.time}</Text>
          </View>
        </View>

        <View style={styles.message}>
          <Text style={styles.messageText}>{n.message}</Text>
        </View>

        {n.event ? (
          <>
            <View style={styles.card}>
              <InfoRow icon="calendar-outline" label="Date" value={n.event.date} />
              <InfoRow icon="time-outline" label="Time" value={n.event.time} />
              <InfoRow icon="location" label="Venue" value={n.event.venue} />
            </View>
            <PrimaryButton title="View Events" icon="calendar-outline" onPress={() => navigation.navigate('Events', { screen: 'EventsMain' })} />
            <OutlineButton title="Add to Calendar" icon="calendar-number-outline" onPress={() => Alert.alert('Add to Calendar', 'Coming soon.')} />
          </>
        ) : null}

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Ionicons name="notifications-off-outline" size={20} color={colors.primary} />
            <View style={common.flex}>
              <Text style={styles.settingTitle}>Mute similar alerts</Text>
              <Text style={styles.settingSub}>Don't receive this type of notification</Text>
            </View>
            <Switch
              value={muted}
              onValueChange={setMuted}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
          <View style={common.divider} />
          <Pressable style={styles.settingRow} onPress={() => navigation.navigate('Settings')} accessibilityRole="button">
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <View style={common.flex}>
              <Text style={styles.settingTitle}>Notification preferences</Text>
              <Text style={styles.settingSub}>Manage your notification settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  infoValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  settingSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
});
