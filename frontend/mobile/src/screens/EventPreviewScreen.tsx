import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { Ionicons, type IoniconName } from '../icons';
import { submitEvent } from '../services/eventSubmit';
import type { EventBody } from '../api/executive';
import { formatDate, formatDateTime, formatTime, fromIsoDay, isoDayCount } from '../utils/date';
import { AppHeader, Checkbox, OutlineButton, PermissionGate, PrimaryButton } from '../components';
import { useT } from '../i18n';
import DatePickerSheet from '../components/sheets/DatePickerSheet';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'EventPreview'>;

export default function EventPreviewScreen() {
  return (
    <PermissionGate permission="events">
      <EventPreview />
    </PermissionGate>
  );
}

function EventPreview() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'EventPreview'>>();
  const { event, editId } = params;
  const createdOn = useMemo(() => formatDateTime(new Date()), []);
  const [iosPickerValue, setIosPickerValue] = useState<Date | null>(null);
  const [saving, setSaving] = useState<EventBody['action'] | null>(null);
  const [emailMembers, setEmailMembers] = useState(false);

  const days = event.endDay ? isoDayCount(event.day, event.endDay) : 1;
  const startText = formatDate(fromIsoDay(event.day));
  const dateText = event.endDay
    ? `${startText} - ${formatDate(fromIsoDay(event.endDay))}${days > 1 ? ` (${t('{n} Days', { n: days })})` : ''}`
    : startText;
  const [hour, minute] = event.time.split(':').map(Number);
  const timeText = formatTime(new Date(2000, 0, 1, hour, minute));

  // Saved on the server; its message says what happened (posted, scheduled, or sent to the Super Admin)
  const finish = async (action: EventBody['action'], publishAt?: Date) => {
    setSaving(action);
    try {
      const { message } = await submitEvent(event, action, { editId, publishAt, emailMembers });
      Alert.alert(t(action === 'schedule' ? 'Event Scheduled' : 'Event'), message, [
        {
          text: t('OK'),
          onPress: () => {
            navigation.popToTop();
            navigation.navigate('MyEvents');
          },
        },
      ]);
    } catch (e) {
      Alert.alert(t('Could not save the event'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(null);
    }
  };

  const onPost = () => finish('post');

  const onScheduled = (when: Date) => {
    if (when.getTime() <= Date.now()) {
      Alert.alert(t('Invalid time'), t('Please choose a time in the future.'));
      return;
    }
    finish('schedule', when);
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
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['refresh']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={common.flex}>
            <Text style={common.heading}>{t('Event Preview')}</Text>
            <Text style={common.subtext}>{t('Review event details before posting.')}</Text>
          </View>
          <View style={styles.readyPill}>
            <Text style={styles.readyText}>● {t('Ready to Post')}</Text>
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
        <InfoRow icon="time-outline" text={timeText} />
        <InfoRow icon="location-outline" text={event.venue} />

        <Text style={styles.section}>{t('About This Event')}</Text>
        <Text style={styles.description}>{event.description}</Text>

        <View style={styles.card}>
          <DetailRow icon={<Ionicons name="person-outline" size={16} color={colors.primary} />} label="Organizer" value={event.organizer} />
          <View style={common.divider} />
          <DetailRow icon={<Ionicons name="call-outline" size={16} color={colors.primary} />} label="Contact" value={event.contact} />
        </View>

        <Text style={styles.subSection}>{t('Additional Information')}</Text>
        <View style={styles.card}>
          <DetailRow label="Category" value={event.categoryName} />
          <View style={common.divider} />
          <DetailRow label="Created On" value={createdOn} />
        </View>

        {/* Publish and Share (email): the members get the event by email when it goes live */}
        <Checkbox
          checked={emailMembers}
          onChange={setEmailMembers}
          label="Also share by email: every member gets this event in their inbox when it goes live"
          style={styles.emailShare}
        />

        <View style={styles.buttonRow}>
          <OutlineButton title="Edit Event" icon="pencil-outline" onPress={() => navigation.goBack()} style={styles.half} />
          <PrimaryButton title={emailMembers ? 'Post & Share' : 'Post Event'} icon="send" onPress={onPost} loading={saving === 'post'} disabled={!!saving} style={styles.half} />
        </View>
        <OutlineButton title="Schedule for Later" icon="time-outline" onPress={saving ? () => {} : onSchedule} style={styles.schedule} />
      </ScrollView>

      {iosPickerValue ? (
        <DatePickerSheet
          mode="datetime"
          value={iosPickerValue}
          minimumDate={new Date()}
          doneLabel="Schedule"
          onChange={setIosPickerValue}
          onCancel={() => setIosPickerValue(null)}
          onDone={() => {
            const when = iosPickerValue;
            setIosPickerValue(null);
            onScheduled(when);
          }}
        />
      ) : null}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: IoniconName; text?: string }) {
  if (!text) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon?: ReactNode; label: string; value?: string }) {
  const t = useT();
  return (
    <View style={styles.detailRow}>
      {icon}
      <Text style={styles.detailLabel}>{t(label)}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  scroll: { padding: 16, paddingBottom: 32 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  readyPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.goldTint,
    marginTop: 2,
  },
  readyText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.goldText },

  banner: { width: '100%', height: 190, borderRadius: 14, marginTop: 14 },
  bannerEmpty: { backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28, color: colors.textDark, marginTop: 14, marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },

  section: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, marginTop: 20, marginBottom: 6 },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textMuted },
  subSection: { fontFamily: fonts.bold, fontSize: 14, color: colors.textDark, marginTop: 18, marginBottom: 8 },

  card: { ...surface, paddingHorizontal: 12, marginTop: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  detailLabel: { width: 90, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  detailValue: { flex: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark, textAlign: 'right' },

  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  half: { flex: 1, width: 'auto' },
  schedule: { marginTop: 10 },
  emailShare: { marginTop: 18 },
}));
