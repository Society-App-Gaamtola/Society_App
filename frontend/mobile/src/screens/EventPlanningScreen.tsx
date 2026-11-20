import { memo, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, type Tone, themedStyles } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { deleteEventPlan, getEventPlans, saveEventPlan, type ApiEventPlan, type PlanStatus } from '../api/executive';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons } from '../icons';
import { formatDate, fromIsoDay, toIsoDay } from '../utils/date';
import { showToast } from '../utils/toast';
import {
  AppHeader,
  EmptyState,
  FilterChips,
  FormField,
  InputField,
  MetaRow,
  OutlineButton,
  PermissionGate,
  PickerField,
  Pill,
  PrimaryButton,
  TextAreaField,
} from '../components';
import ModalSheet from '../components/sheets/ModalSheet';
import DatePickerSheet from '../components/sheets/DatePickerSheet';
import { useT } from '../i18n';

const STATUSES: { status: PlanStatus; label: string; tone: Tone }[] = [
  { status: 'idea', label: 'Idea', tone: tones.neutral },
  { status: 'planning', label: 'Planning', tone: tones.info },
  { status: 'approved', label: 'Approved', tone: tones.success },
  { status: 'converted', label: 'Event Created', tone: tones.success },
  { status: 'dropped', label: 'Dropped', tone: tones.danger },
];
const STATUS_INFO = Object.fromEntries(STATUSES.map((s) => [s.status, s])) as Record<PlanStatus, (typeof STATUSES)[number]>;

const FILTERS = ['All', 'Idea', 'Planning', 'Approved', 'Dropped'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_STATUS: Record<Filter, PlanStatus | undefined> = { All: undefined, Idea: 'idea', Planning: 'planning', Approved: 'approved', Dropped: 'dropped' };

type Form = { id?: number; title: string; notes: string; date: string | null; status: PlanStatus };
const EMPTY_FORM: Form = { title: '', notes: '', date: null, status: 'idea' };

const Separator = () => <View style={styles.separator} />;

/** The executives' planning board for coming events (GET / POST / PUT / DELETE /user/event-plans) */
export default function EventPlanningScreen() {
  return (
    <PermissionGate permission="events">
      <EventPlanning />
    </PermissionGate>
  );
}

function EventPlanning() {
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'EventPlanning'>>();
  const [filter, setFilter] = useState<Filter>('All');
  const [form, setForm] = useState<Form | null>(null);

  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getEventPlans(page, { status: FILTER_STATUS[filter] });
      return { items: data.plans, pagination: data.pagination };
    },
    [filter],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  // Back from Create Event: a plan turned into an event shows "Event Created"
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) refresh();
      focusedBefore.current = true;
    }, [refresh]),
  );

  // A new event from the plan: its title, date and notes fill the form; saving it marks the plan "Event Created"
  const onCreateEvent = useCallback(
    (p: ApiEventPlan) =>
      navigation.navigate('CreateEvent', {
        draft: {
          title: p.title,
          categoryId: 0,
          categoryName: '',
          day: p.tentative_date ?? '',
          time: '',
          venue: '',
          organizer: '',
          contact: '',
          description: p.notes ?? '',
          planId: p.id,
        },
      }),
    [navigation],
  );

  const onEdit = useCallback(
    (p: ApiEventPlan) => setForm({ id: p.id, title: p.title, notes: p.notes ?? '', date: p.tentative_date, status: p.status }),
    [],
  );
  const onDelete = useCallback(
    (p: ApiEventPlan) =>
      Alert.alert(t('Delete plan'), t('Delete "{title}"?', { title: p.title }), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () =>
            deleteEventPlan(p.id)
              .then(({ message }) => {
                showToast(message);
                refresh();
              })
              .catch((e) => Alert.alert(t('Could not delete'), e instanceof Error ? e.message : t('Please try again.'))),
        },
      ]),
    [refresh, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiEventPlan }) => <PlanCard plan={item} onEdit={onEdit} onDelete={onDelete} onCreateEvent={onCreateEvent} />,
    [onEdit, onDelete, onCreateEvent],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View style={common.flex}>
                <Text style={common.heading}>{t('Event Planning')}</Text>
                <Text style={common.subtextRelaxed}>{t('Ideas and plans for coming events, shared with the executive team.')}</Text>
              </View>
              <Pressable style={styles.addButton} onPress={() => setForm(EMPTY_FORM)} accessibilityRole="button">
                <Text style={styles.addButtonText}>{t('+ Add Plan')}</Text>
              </Pressable>
            </View>
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'clipboard-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load the plans. Pull down to try again." : 'No plans yet'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
        renderItem={renderItem}
      />

      {form ? (
        <PlanSheet
          form={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            refresh();
          }}
        />
      ) : null}
    </View>
  );
}

type CardProps = {
  plan: ApiEventPlan;
  onEdit: (p: ApiEventPlan) => void;
  onDelete: (p: ApiEventPlan) => void;
  onCreateEvent: (p: ApiEventPlan) => void;
};

const PlanCard = memo(function PlanCard({ plan, onEdit, onDelete, onCreateEvent }: CardProps) {
  const t = useT();
  const info = STATUS_INFO[plan.status];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.title}>{plan.title}</Text>
        <Pill label={info.label} tone={info.tone} />
      </View>
      <MetaRow icon="calendar-outline" text={plan.tentative_date ? formatDate(fromIsoDay(plan.tentative_date)) : t('Date not fixed yet')} />
      {plan.created_by_name ? <MetaRow icon="person-outline" text={plan.created_by_name} /> : null}
      {plan.notes ? <Text style={styles.notes}>{plan.notes}</Text> : null}
      {plan.can_edit ? (
        <View style={styles.actions}>
          {plan.status !== 'converted' && plan.status !== 'dropped' ? (
            <Pressable style={styles.action} onPress={() => onCreateEvent(plan)} hitSlop={6} accessibilityRole="button">
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionText, styles.primary]}>{t('Create Event')}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.action} onPress={() => onEdit(plan)} hitSlop={6} accessibilityRole="button">
            <Ionicons name="create-outline" size={16} color={colors.textDark} />
            <Text style={styles.actionText}>{t('Edit')}</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => onDelete(plan)} hitSlop={6} accessibilityRole="button">
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[styles.actionText, styles.danger]}>{t('Delete')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

/** Add / edit a plan in a bottom sheet */
function PlanSheet({ form, onClose, onSaved }: { form: Form; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(form);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [iosDate, setIosDate] = useState<Date | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const pickDate = () => {
    const value = draft.date ? fromIsoDay(draft.date) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ mode: 'date', value, onChange: (e, d) => e.type === 'set' && d && set('date', toIsoDay(d)) });
    } else {
      setIosDate(value);
    }
  };

  const save = async () => {
    if (!draft.title.trim()) {
      setError(t('Please enter a title.'));
      return;
    }
    setSaving(true);
    try {
      const { message } = await saveEventPlan({ title: draft.title.trim(), notes: draft.notes.trim(), tentative_date: draft.date, status: draft.status }, draft.id);
      showToast(message);
      onSaved();
    } catch (e) {
      Alert.alert(t('Could not save the plan'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible animationType="slide" onClose={onClose} style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.sheetTitle}>{t(draft.id ? 'Edit Plan' : 'New Plan')}</Text>
        <FormField label="Title" error={error || undefined}>
          <InputField placeholder="e.g. Diwali Rangoli competition" value={draft.title} onChangeText={(v) => { set('title', v); setError(''); }} maxLength={256} />
        </FormField>
        <FormField label="Tentative date" required={false}>
          <PickerField icon="calendar-outline" placeholder="Not fixed yet" value={draft.date ? formatDate(fromIsoDay(draft.date)) : undefined} onPress={pickDate} />
        </FormField>
        {draft.date ? (
          <Pressable onPress={() => set('date', null)} hitSlop={8}>
            <Text style={styles.clearDate}>{t('Clear date')}</Text>
          </Pressable>
        ) : null}
        <FormField label="Status">
          <View style={styles.statusRow}>
            {STATUSES.filter((s) => s.status !== 'converted').map((s) => {
              const active = s.status === draft.status;
              return (
                <Pressable key={s.status} onPress={() => set('status', s.status)} style={[styles.statusChip, active && styles.statusChipActive]} accessibilityRole="radio" accessibilityState={{ selected: active }}>
                  <Text style={[styles.statusText, active && styles.statusTextActive]}>{t(s.label)}</Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
        <FormField label="Notes" required={false}>
          <TextAreaField placeholder="Budget, volunteers, things to arrange..." maxLength={2000} minHeight={100} value={draft.notes} onChangeText={(v) => set('notes', v)} />
        </FormField>
        <View style={styles.buttons}>
          <OutlineButton title="Cancel" onPress={onClose} style={styles.half} />
          <PrimaryButton title="Save Plan" onPress={save} loading={saving} style={styles.half} />
        </View>
      </ScrollView>
      {iosDate ? (
        <DatePickerSheet
          mode="date"
          value={iosDate}
          onChange={setIosDate}
          onCancel={() => setIosDate(null)}
          onDone={() => {
            set('date', toIsoDay(iosDate));
            setIosDate(null);
          }}
        />
      ) : null}
    </ModalSheet>
  );
}

const styles = themedStyles(() => ({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addButton: { height: 34, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', marginTop: 4 },
  addButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
  chips: { marginTop: 12, marginBottom: 14 },
  loading: { marginVertical: 24 },
  separator: { height: 12 },
  card: { ...surface, padding: 12, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 2 },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  notes: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  danger: { color: colors.danger },
  primary: { color: colors.primary },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '90%' },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.textDark, marginBottom: 12 },
  clearDate: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: -8, marginBottom: 12 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center' },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  statusTextActive: { color: colors.white },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  half: { flex: 1, width: 'auto' },
}));
