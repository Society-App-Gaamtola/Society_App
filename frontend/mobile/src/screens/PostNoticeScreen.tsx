import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { createNotice, getMyNotice, updateNotice, type NoticeBody } from '../api/executive';
import { getEvents, type ApiEvent } from '../api/user';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import { formatDate, fromIsoDay } from '../utils/date';
import { showToast } from '../utils/toast';
import { AppHeader, Checkbox, FormActionBar, FormField, InputField, KeyboardAvoid, PermissionGate, PickerField, SelectSheet, TextAreaField } from '../components';
import { noticeTagLabel, refreshAppInfo, useAppInfo } from '../services/appInfo';
import { useT } from '../i18n';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'PostNotice'>;
type Field = 'title' | 'body';

const NO_EVENT = 'No event';
const MAX_TITLE = 256;
const MAX_BODY = 2000;

/** Post a notice to every member (POST /user/notices), or save it as a draft. It can name an upcoming event,
 *  so the notice's WhatsApp share carries that event's venue and map link. With noticeId: edit that notice (PUT). */
export default function PostNoticeScreen() {
  return (
    <PermissionGate permission="notices">
      <PostNoticeForm />
    </PermissionGate>
  );
}

function PostNoticeForm() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const editId = useRoute<RouteProp<HomeStackParamList, 'PostNotice'>>().params?.noticeId;
  const [loadingNotice, setLoadingNotice] = useState(!!editId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // The categories come from App Settings (Important / General / Event are translated, the society's own show as typed)
  const tags = useAppInfo().notice_tags;
  const [tag, setTag] = useState<NoticeBody['tag']>('general');
  const [emailMembers, setEmailMembers] = useState(false);
  const [published, setPublished] = useState(false);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventSheet, setEventSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const { errors, setErrors, fieldProps } = useFormErrors<Field>();

  // The latest notice categories; a new notice starts on General, or the first category when General was removed
  useEffect(() => {
    refreshAppInfo();
  }, []);
  useEffect(() => {
    if (!editId && !tags.includes(tag)) setTag(tags[0]);
  }, [editId, tags, tag]);

  // Upcoming events the notice can be about
  useEffect(() => {
    getEvents(1, { upcoming: true, limit: 50 })
      .then(({ data }) => setEvents(data.events))
      .catch(() => {});
  }, []);

  // Editing: the saved notice fills the form
  useEffect(() => {
    if (!editId) return;
    getMyNotice(editId)
      .then(({ data }) => {
        setTitle(data.notice.title);
        setBody(data.notice.body);
        setTag(data.notice.tag);
        setEventId(data.notice.event_id);
        setPublished(data.notice.status === 'published');
        setEmailMembers(data.notice.email_members === 1);
      })
      .catch((e) => Alert.alert(t('Could not load the notice'), e instanceof Error ? e.message : t('Please try again.')))
      .finally(() => setLoadingNotice(false));
  }, [editId, t]);

  const eventLabel = (e: ApiEvent) => `${e.title} · ${formatDate(fromIsoDay(e.event_date))}`;
  const chosen = events.find((e) => e.id === eventId);

  const save = async (action: NoticeBody['action']) => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Please enter the notice title.';
    if (!body.trim()) next.body = 'Please write the notice.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const notice: NoticeBody = {
        title: title.trim(),
        body: body.trim(),
        tag,
        event_id: eventId,
        action,
        email_members: action === 'publish' && emailMembers,
      };
      const { message } = editId ? await updateNotice(editId, notice) : await createNotice(notice);
      showToast(message);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('Could not save the notice'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadingNotice) {
    return (
      <View style={common.screen}>
        <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>{t(editId ? 'Edit Notice' : 'Post Notice')}</Text>
          <Text style={styles.subtext}>{t('Members see the notice on the Notice Board and get a notification.')}</Text>

          <FormField label="Notice Title" error={errors.title}>
            <InputField placeholder="e.g. Navratri volunteers meeting" value={title} maxLength={MAX_TITLE} {...fieldProps('title', setTitle)} />
          </FormField>

          <FormField label="Category">
            <View style={styles.chips}>
              {tags.map((value) => {
                const label = noticeTagLabel(value);
                const active = value === tag;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setTag(value)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(label)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </FormField>

          <FormField label="Notice" error={errors.body}>
            <TextAreaField placeholder="Write the notice for members..." maxLength={MAX_BODY} minHeight={140} value={body} {...fieldProps('body', setBody)} />
          </FormField>

          <FormField label="About an event (optional)" required={false}>
            <PickerField
              icon="calendar-outline"
              placeholder="Choose an upcoming event"
              trailingIcon="chevron-down"
              value={chosen ? eventLabel(chosen) : undefined}
              onPress={() => setEventSheet(true)}
            />
          </FormField>
          {chosen ? (
            <View style={styles.hint}>
              <Ionicons name="location-outline" size={14} color={colors.primary} />
              <Text style={styles.hintText}>{t('Sharing this notice also sends the event venue and map link.')}</Text>
            </View>
          ) : null}

          {/* Publish and Share (email): only before the notice is first published (it was announced then) */}
          {!published ? (
            <Checkbox
              checked={emailMembers}
              onChange={setEmailMembers}
              label="Also share by email: members get this notice in their inbox when it is published"
              style={styles.emailShare}
            />
          ) : null}
        </ScrollView>

        <FormActionBar
          onSaveDraft={() => save('draft')}
          primaryTitle={emailMembers && !published ? 'Publish & Share' : 'Publish Notice'}
          onPrimary={() => save('publish')}
          busy={saving}
        />
      </KeyboardAvoid>

      <SelectSheet
        visible={eventSheet}
        title="Choose an event"
        options={[NO_EVENT, ...events.map(eventLabel)]}
        selected={chosen ? eventLabel(chosen) : NO_EVENT}
        onSelect={(label) => setEventId(events.find((e) => eventLabel(e) === label)?.id ?? null)}
        onClose={() => setEventSheet(false)}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  scroll: { padding: 16, paddingBottom: 24 },
  loading: { marginTop: 40 },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  // Wraps onto more rows when the society has added categories
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexGrow: 1,
    minWidth: 88,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  chipTextActive: { color: colors.white },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  hintText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  emailShare: { marginTop: 14 },
}));
