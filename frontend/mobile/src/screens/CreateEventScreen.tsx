import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts } from '../theme';
import { MAX_UPLOAD_BYTES } from '../config';
import { useExecEvents } from '../context/EventsContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { Ionicons } from '../icons';
import type { EventCategory, NewExecEvent } from '../types';
import { formatDate, formatTime, startOfDay } from '../utils/date';
import { showToast } from '../utils/toast';
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

const CATEGORIES: EventCategory[] = ['Festival', 'Aarti', 'Cultural', 'Meeting'];
const MAX_DESCRIPTION = 500;

export default function CreateEventScreen() {
  return (
    <PermissionGate permission="events">
      <CreateEventForm />
    </PermissionGate>
  );
}

function CreateEventForm() {
  const navigation = useNavigation<Nav>();
  const { addEvent } = useExecEvents();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDate, setShowEndDate] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const [venue, setVenue] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
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

  const buildEvent = (status: NewExecEvent['status']): NewExecEvent => ({
    title: title.trim(),
    category: category ?? 'Festival',
    date: date ? formatDate(date) : '',
    endDate: endDate ? formatDate(endDate) : undefined,
    time: time ? formatTime(time) : undefined,
    venue: venue.trim(),
    organizer: organizer.trim(),
    contact: contact.trim(),
    description: description.trim(),
    imageUri: imageUri ?? undefined,
    status,
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
    if (!imageUri) next.image = 'Please upload an event banner.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSaveDraft = () => {
    if (!title.trim()) {
      setError('title', 'Add a title to save the draft.');
      return;
    }
    addEvent(buildEvent('Draft'));
    showToast('Draft saved');
  };

  const onNext = () => {
    if (!validate()) {
      showToast('Please fill all required fields');
      return;
    }
    navigation.navigate('EventPreview', { event: buildEvent('Draft') });
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={common.heading}>Create New Event</Text>
          <Text style={styles.subtext}>Fill in the event details. Event will be visible to members after publishing.</Text>

          <FormField label="Event Title" error={errors.title}>
            <InputField placeholder="e.g. Navratri Garba Mahotsav" value={title} {...fieldProps('title', setTitle)} />
          </FormField>

          <FormField label="Event Category" error={errors.category}>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setCategory(c);
                      clearError('category');
                    }}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
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
              <Text style={styles.addEndText}>Add end date (multi-day event)</Text>
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

          <FormField label="Event Banner / Image" error={errors.image}>
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

        <FormActionBar onSaveDraft={onSaveDraft} primaryTitle="Next →" onPrimary={onNext} />
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

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24 },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },

  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
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
});
