import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { useExecEvents, type NewExecEvent } from '../events/EventsContext';
import { dayCount, formatDateTime } from '../utils/date';
import { AppHeader, OutlineButton, PermissionGate, PrimaryButton } from '../components';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'EventPreview'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

export default function EventPreviewScreen() {
  return (
    <PermissionGate permission="events">
      <EventPreview />
    </PermissionGate>
  );
}

function EventPreview() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'EventPreview'>>();
  const { user } = useAuth();
  const { addEvent } = useExecEvents();
  const event = params.event;
  const createdOn = useMemo(() => formatDateTime(new Date()), []);
  const [iosPickerValue, setIosPickerValue] = useState<Date | null>(null);

  const days = dayCount(event.date, event.endDate);
  const dateText = event.endDate
    ? `${event.date} - ${event.endDate}${days && days > 1 ? ` (${days} Days)` : ''}`
    : event.date;

  const finish = (status: NewExecEvent['status'], message: string, scheduledAt?: number) => {
    addEvent({ ...event, status, scheduledAt });
    Alert.alert(status === 'Scheduled' ? 'Event Scheduled' : 'Event', message, [
      {
        text: 'OK',
        onPress: () => {
          navigation.popToTop();
          navigation.navigate('MyEvents');
        },
      },
    ]);
  };

  const onPost = () => {
    if (user?.eventsNeedApproval) finish('Needs Approval', 'Event sent to Super Admin for approval');
    else finish('Posted', 'Event posted successfully');
  };

  const onScheduled = (when: Date) => {
    if (when.getTime() <= Date.now()) {
      Alert.alert('Invalid time', 'Please choose a time in the future.');
      return;
    }
    finish('Scheduled', `Event will be posted on ${formatDateTime(when)}.`, when.getTime());
  };

  const onSchedule = () => {
    const initial = new Date(Date.now() + 60 * 60 * 1000);
    if (Platform.OS !== 'android') {
      setIosPickerValue(initial);
      return;
    }
    // Android has no combined picker: pick the date, then the time.
    DateTimePickerAndroid.open({
      mode: 'date',
      value: initial,
      minimumDate: new Date(),
      onChange: (e, day) => {
        if (e.type !== 'set' || !day) return;
        DateTimePickerAndroid.open({
          mode: 'time',
          value: initial,
          is24Hour: false,
          onChange: (e2, time) => {
            if (e2.type !== 'set' || !time) return;
            const when = new Date(day);
            when.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onScheduled(when);
          },
        });
      },
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader leftType="back" rightIcons={['refresh']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text style={styles.heading}>Event Preview</Text>
            <Text style={styles.subtext}>Review event details before posting.</Text>
          </View>
          <View style={styles.readyPill}>
            <Text style={styles.readyText}>● Ready to Post</Text>
          </View>
        </View>

        {event.imageUri ? (
          <Image source={{ uri: event.imageUri }} style={styles.banner} />
        ) : (
          <View style={[styles.banner, styles.bannerEmpty]}>
            <Ionicons name="image-outline" size={36} color={colors.lightGold} />
          </View>
        )}

        <Text style={styles.title}>{event.title}</Text>
        <InfoRow icon="calendar-outline" text={dateText} />
        {event.time ? <InfoRow icon="time-outline" text={event.time} /> : null}
        <InfoRow icon="location-outline" text={event.venue} />

        <Text style={styles.section}>About This Event</Text>
        <Text style={styles.description}>{event.description}</Text>

        <View style={styles.card}>
          <DetailRow icon={<Ionicons name="person-outline" size={16} color={colors.primary} />} label="Organizer" value={event.organizer} />
          <View style={styles.divider} />
          <DetailRow icon={<Ionicons name="call-outline" size={16} color={colors.primary} />} label="Contact" value={event.contact} />
        </View>

        <Text style={styles.subSection}>Additional Information</Text>
        <View style={styles.card}>
          <DetailRow label="Category" value={event.category} />
          <View style={styles.divider} />
          <DetailRow label="Created On" value={createdOn} />
        </View>

        <View style={styles.warning}>
          <Ionicons name="alert-circle-outline" size={22} color="#E0700B" />
          <View style={styles.flex}>
            <Text style={styles.warningTitle}>Publishing is subject to permission settings.</Text>
            <Text style={styles.warningText}>Event will be visible to members after posting and required approvals.</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <OutlineButton title="Edit Event" icon="pencil-outline" onPress={() => navigation.goBack()} style={styles.half} />
          <PrimaryButton title="Post Event" icon="send" onPress={onPost} style={styles.half} />
        </View>
        <OutlineButton title="Schedule for Later" icon="time-outline" onPress={onSchedule} style={styles.schedule} />
      </ScrollView>

      {iosPickerValue ? (
        <Modal transparent animationType="slide" onRequestClose={() => setIosPickerValue(null)}>
          <Pressable style={styles.backdrop} onPress={() => setIosPickerValue(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setIosPickerValue(null)} hitSlop={8}>
                <Text style={styles.sheetCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const when = iosPickerValue;
                  setIosPickerValue(null);
                  onScheduled(when);
                }}
                hitSlop={8}
              >
                <Text style={styles.sheetDone}>Schedule</Text>
              </Pressable>
            </View>
            <DateTimePicker
              mode="datetime"
              display="spinner"
              value={iosPickerValue}
              minimumDate={new Date()}
              onChange={(_, d) => d && setIosPickerValue(d)}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: IconName; text?: string }) {
  if (!text) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon?: ReactNode; label: string; value?: string }) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  readyPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FBF1D6',
    marginTop: 2,
  },
  readyText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#8A6A12' },

  banner: { width: '100%', height: 190, borderRadius: 14, marginTop: 14 },
  bannerEmpty: { backgroundColor: '#EFE6DC', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28, color: colors.textDark, marginTop: 14, marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },

  section: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, marginTop: 20, marginBottom: 6 },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textMuted },
  subSection: { fontFamily: fonts.bold, fontSize: 14, color: colors.textDark, marginTop: 18, marginBottom: 8 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  divider: { height: 1, backgroundColor: colors.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  detailLabel: { width: 90, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  detailValue: { flex: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, textAlign: 'right' },

  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF6DB',
    borderWidth: 1,
    borderColor: '#F1DFA0',
    borderRadius: 10,
    padding: 12,
    marginTop: 18,
  },
  warningTitle: { fontFamily: fonts.bold, fontSize: 12, color: colors.textDark },
  warningText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 2 },

  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  half: { flex: 1, width: 'auto' },
  schedule: { marginTop: 10 },

  backdrop: { flex: 1, backgroundColor: 'rgba(43, 26, 18, 0.35)' },
  sheet: { backgroundColor: colors.white, paddingBottom: 24 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetCancel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  sheetDone: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
});
