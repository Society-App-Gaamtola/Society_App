import { useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, themedStyles } from '../theme';
import { MAX_UPLOAD_BYTES } from '../config';
import { getEventCategories, type ApiCategory } from '../api/user';
import { submitEvent } from '../services/eventSubmit';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import type { EventDraft } from '../types';
import { formatDate, formatTime, fromIsoDay, startOfDay, toIsoDay } from '../utils/date';
import { showToast } from '../utils/toast';
import { useT } from '../i18n';
import { digitsOnly } from '../utils/validation';
import {
  AppHeader,
  FormActionBar,
  FormField,
  InputField,
  KeyboardAvoid,
  PermissionGate,
  PickerField,
  TextAreaField,
  UploadBox,
} from '../components';
import DatePickerSheet from '../components/sheets/DatePickerSheet';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateEvent'>;
type PickerMode = 'date' | 'time';
type Field = 'title' | 'category' | 'date' | 'endDate' | 'time' | 'venue' | 'organizer' | 'contact' | 'description' | 'image';

const MAX_DESCRIPTION = 500;

const pad2 = (n: number) => String(n).padStart(2, '0');
/** "18:30" → a Date today at that time (for the time picker) */
const timeToDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export default function CreateEventScreen() {
  return (
    <PermissionGate permission="events">
      <CreateEventForm />
    </PermissionGate>
  );
}

function CreateEventForm() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  // A copy to start from (Duplicate in My Events) or the event being edited (editId)
  const { params } = useRoute<RouteProp<HomeStackParamList, 'CreateEvent'>>();
  const start = params?.draft;
  const editId = params?.editId;

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [title, setTitle] = useState(start?.title ?? '');
  // A draft from an Event Planning plan has no category and maybe no date yet
  const [category, setCategory] = useState<{ id: number; name: string } | null>(start?.categoryId ? { id: start.categoryId, name: start.categoryName } : null);
  const [date, setDate] = useState<Date | null>(start?.day ? fromIsoDay(start.day) : null);
  const [endDate, setEndDate] = useState<Date | null>(start?.endDay ? fromIsoDay(start.endDay) : null);
  const [showEndDate, setShowEndDate] = useState(!!start?.endDay);
  const [time, setTime] = useState<Date | null>(start?.time ? timeToDate(start.time) : null);
  const [venue, setVenue] = useState(start?.venue ?? '');
  const [organizer, setOrganizer] = useState(start?.organizer ?? '');
  const [contact, setContact] = useState(start?.contact ?? '');
  const [description, setDescription] = useState(start?.description ?? '');
  const [imageUri, setImageUri] = useState<string | null>(start?.imageUri ?? null);
  const [saving, setSaving] = useState(false);

  // The society's event categories (App Settings), named in the app's language
  useEffect(() => {
    getEventCategories()
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);
  const { errors, setErrors, clearError, setError, fieldProps } = useFormErrors<Field>();
  // iOS shows the picker in a sheet; Android uses the native dialog.
  const [iosPicker, setIosPicker] = useState<{ mode: PickerMode; value: Date; onPick: (d: Date) => void } | null>(null);

  const openPicker = (mode: PickerMode, current: Date | null, onPick: (d: Date) => void, minimumDate?: Date) => {
    const value = current ?? minimumDate ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode,
        value,
        minimumDate: mode === 'date' ? minimumDate : undefined,
        is24Hour: false,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) onPick(picked);
        },
      });
    } else {
      setIosPicker({ mode, value, onPick });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
      setError('image', 'Image must be smaller than 5 MB.');
      return;
    }
    clearError('image');
    setImageUri(asset.uri);
  };

  const buildDraft = (): EventDraft => ({
    title: title.trim(),
    categoryId: category?.id ?? 0,
    categoryName: category?.name ?? '',
    day: date ? toIsoDay(date) : '',
    endDay: endDate ? toIsoDay(endDate) : undefined,
    time: time ? `${pad2(time.getHours())}:${pad2(time.getMinutes())}` : '',
    venue: venue.trim(),
    organizer: organizer.trim(),
    contact: contact.trim(),
    description: description.trim(),
    imageUri: imageUri ?? undefined,
    planId: editId ? undefined : start?.planId,
  });

  const validate = () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Please enter the event title.';
    if (!category) next.category = 'Please select a category.';
    if (!date) next.date = 'Select a date.';
    if (date && endDate && startOfDay(endDate) < startOfDay(date)) next.endDate = 'End date must be after the start date.';
    if (!time) next.time = 'Select a time.';
    if (!venue.trim()) next.venue = 'Please enter the venue.';
    if (!organizer.trim()) next.organizer = 'Please enter the organizer.';
    if (!contact.trim()) next.contact = 'Please enter a contact number.';
    else if (digitsOnly(contact).length < 10) next.contact = 'Enter a valid contact number.';
    if (!description.trim()) next.description = 'Please enter a description.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // A draft is saved on the server too, so it needs the basics: title, category, date, time and venue
  const onSaveDraft = async () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Please enter the event title.';
    if (!category) next.category = 'Please select a category.';
    if (!date) next.date = 'Select a date.';
    if (!time) next.time = 'Select a time.';
    if (!venue.trim()) next.venue = 'Please enter the venue.';
    setErrors(next);
    if (Object.keys(next).length) {
      showToast(t('Add the title, category, date, time and venue to save a draft'));
      return;
    }
    setSaving(true);
    try {
      const { message } = await submitEvent(buildDraft(), 'draft', { editId });
      showToast(message);
      navigation.navigate('MyEvents');
    } catch (e) {
      Alert.alert(t('Could not save the draft'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const onNext = () => {
    if (!validate()) {
      showToast(t('Please fill all required fields'));
      return;
    }
    navigation.navigate('EventPreview', { event: buildDraft(), editId });
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>{t(editId ? 'Edit Event' : 'Create New Event')}</Text>
          <Text style={styles.subtext}>{t('Fill in the event details. Event will be visible to members after publishing.')}</Text>

          <FormField label="Event Title" error={errors.title}>
            <InputField placeholder="e.g. Navratri Garba Mahotsav" value={title} {...fieldProps('title', setTitle)} />
          </FormField>

          <FormField label="Event Category" error={errors.category}>
            <View style={styles.chips}>
              {categories.map((c) => {
                const active = c.id === category?.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCategory({ id: c.id, name: c.name });
                      clearError('category');
                    }}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </FormField>

          <View style={styles.row}>
            <FormField label="Event Date" error={errors.date} style={common.flex}>
              <PickerField
                icon="calendar-outline"
                placeholder="Select date"
                value={date ? formatDate(date) : undefined}
                error={!!errors.date}
                onPress={() =>
                  openPicker('date', date, (d) => {
                    setDate(d);
                    clearError('date');
                    if (endDate && startOfDay(endDate) < startOfDay(d)) setEndDate(null);
                  }, startOfDay(new Date()))
                }
              />
            </FormField>
            <FormField label="Event Time" error={errors.time} style={common.flex}>
              <PickerField
                icon="time-outline"
                placeholder="Select time"
                value={time ? formatTime(time) : undefined}
                error={!!errors.time}
                onPress={() =>
                  openPicker('time', time, (d) => {
                    setTime(d);
                    clearError('time');
                  })
                }
              />
            </FormField>
          </View>

          {showEndDate ? (
            <FormField label="End Date (multi-day event)" required={false} error={errors.endDate}>
              <View style={styles.row}>
                <View style={common.flex}>
                  <PickerField
                    icon="calendar-outline"
                    placeholder="Select end date"
                    value={endDate ? formatDate(endDate) : undefined}
                    error={!!errors.endDate}
                    onPress={() =>
                      openPicker('date', endDate, (d) => {
                        setEndDate(d);
                        clearError('endDate');
                      }, date ?? startOfDay(new Date()))
                    }
                  />
                </View>
                <Pressable
                  style={styles.removeEnd}
                  onPress={() => {
                    setEndDate(null);
                    setShowEndDate(false);
                    clearError('endDate');
                  }}
                  accessibilityLabel="Remove end date"
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            </FormField>
          ) : (
            <Pressable onPress={() => setShowEndDate(true)} hitSlop={8} style={styles.addEnd}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.addEndText}>{t('Add end date (multi-day event)')}</Text>
            </Pressable>
          )}

          <FormField label="Venue" error={errors.venue}>
            <InputField
              icon="location-outline"
              placeholder="e.g. Society Premises, Vadodara"
              value={venue}
              {...fieldProps('venue', setVenue)}
            />
          </FormField>

          <FormField label="Organizer" error={errors.organizer}>
            <InputField
              icon="person-outline"
              placeholder="e.g. Executive Committee"
              value={organizer}
              {...fieldProps('organizer', setOrganizer)}
            />
          </FormField>

          <FormField label="Contact Number" error={errors.contact}>
            <InputField
              icon="call-outline"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              maxLength={16}
              value={contact}
              {...fieldProps('contact', setContact)}
            />
          </FormField>

          <FormField label="Event Description" error={errors.description}>
            <TextAreaField
              placeholder="Write a detailed description about the event, activities, dress code, and other important information..."
              maxLength={MAX_DESCRIPTION}
              minHeight={100}
              value={description}
              {...fieldProps('description', setDescription)}
            />
          </FormField>

          <FormField label="Event Banner / Image" required={false} error={errors.image}>
            {imageUri ? (
              <View style={styles.preview}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <Pressable style={styles.previewRemove} onPress={() => setImageUri(null)} accessibilityLabel="Remove image">
                  <Ionicons name="close" size={18} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <UploadBox title="Tap to upload event banner" hint="JPG, PNG up to 5 MB" error={!!errors.image} onPress={pickImage} />
            )}
          </FormField>
        </ScrollView>

        <FormActionBar onSaveDraft={onSaveDraft} primaryTitle="Next →" onPrimary={onNext} busy={saving} />
      </KeyboardAvoid>

      {iosPicker ? (
        <DatePickerSheet
          mode={iosPicker.mode}
          value={iosPicker.value}
          onChange={(value) => setIosPicker((p) => (p ? { ...p, value } : p))}
          onCancel={() => setIosPicker(null)}
          onDone={() => {
            iosPicker.onPick(iosPicker.value);
            setIosPicker(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  scroll: { padding: 16, paddingBottom: 24 },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
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

  addEnd: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -6, marginBottom: 14 },
  addEndText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  removeEnd: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  preview: { borderRadius: 10, overflow: 'hidden' },
  previewImage: { width: '100%', aspectRatio: 16 / 9 },
  previewRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
