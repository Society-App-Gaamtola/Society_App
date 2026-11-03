import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import type { EventCategory } from '../data/mock';
import { useExecEvents, type NewExecEvent } from '../events/EventsContext';
import { showToast } from '../utils/toast';
import { formatDate, formatTime } from '../utils/date';
import { AppHeader, InputField, OutlineButton, PermissionGate, PrimaryButton } from '../components';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateEvent'>;
type PickerMode = 'date' | 'time';
type Field = 'title' | 'category' | 'date' | 'endDate' | 'time' | 'venue' | 'organizer' | 'contact' | 'description' | 'image';
type Errors = Partial<Record<Field, string>>;

const CATEGORIES: EventCategory[] = ['Festival', 'Aarti', 'Cultural', 'Meeting'];
const MAX_DESCRIPTION = 500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ERROR = '#C62828';
const MUTED_ICON = '#9A8F86';
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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
  const [errors, setErrors] = useState<Errors>({});
  // iOS shows the picker in a sheet; Android uses the native dialog.
  const [iosPicker, setIosPicker] = useState<{ mode: PickerMode; value: Date; onPick: (d: Date) => void } | null>(null);

  const clear = (field: Field) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

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
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, image: 'Image must be smaller than 5 MB.' }));
      return;
    }
    clear('image');
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
    const next: Errors = {};
    if (!title.trim()) next.title = 'Please enter the event title.';
    if (!category) next.category = 'Please select a category.';
    if (!date) next.date = 'Select a date.';
    if (date && endDate && startOfDay(endDate) < startOfDay(date)) next.endDate = 'End date must be after the start date.';
    if (!time) next.time = 'Select a time.';
    if (!venue.trim()) next.venue = 'Please enter the venue.';
    if (!organizer.trim()) next.organizer = 'Please enter the organizer.';
    if (!contact.trim()) next.contact = 'Please enter a contact number.';
    else if (contact.replace(/\D/g, '').length < 10) next.contact = 'Enter a valid contact number.';
    if (!description.trim()) next.description = 'Please enter a description.';
    if (!imageUri) next.image = 'Please upload an event banner.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSaveDraft = () => {
    if (!title.trim()) {
      setErrors((e) => ({ ...e, title: 'Add a title to save the draft.' }));
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
    <View style={styles.container}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Create New Event</Text>
          <Text style={styles.subtext}>Fill in the event details. Event will be visible to members after publishing.</Text>

          <FormField label="Event Title" error={errors.title}>
            <InputField
              placeholder="e.g. Navratri Garba Mahotsav"
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                clear('title');
              }}
              containerStyle={errors.title ? styles.inputError : undefined}
            />
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
                      clear('category');
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
            <FormField label="Event Date" error={errors.date} style={styles.flex}>
              <PickerField
                icon="calendar-outline"
                placeholder="Select date"
                value={date ? formatDate(date) : undefined}
                error={!!errors.date}
                onPress={() =>
                  openPicker('date', date, (d) => {
                    setDate(d);
                    clear('date');
                    if (endDate && startOfDay(endDate) < startOfDay(d)) setEndDate(null);
                  }, startOfDay(new Date()))
                }
              />
            </FormField>
            <FormField label="Event Time" error={errors.time} style={styles.flex}>
              <PickerField
                icon="time-outline"
                placeholder="Select time"
                value={time ? formatTime(time) : undefined}
                error={!!errors.time}
                onPress={() =>
                  openPicker('time', time, (d) => {
                    setTime(d);
                    clear('time');
                  })
                }
              />
            </FormField>
          </View>

          {showEndDate ? (
            <FormField label="End Date (multi-day event)" required={false} error={errors.endDate}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <PickerField
                    icon="calendar-outline"
                    placeholder="Select end date"
                    value={endDate ? formatDate(endDate) : undefined}
                    error={!!errors.endDate}
                    onPress={() =>
                      openPicker('date', endDate, (d) => {
                        setEndDate(d);
                        clear('endDate');
                      }, date ?? startOfDay(new Date()))
                    }
                  />
                </View>
                <Pressable
                  style={styles.removeEnd}
                  onPress={() => {
                    setEndDate(null);
                    setShowEndDate(false);
                    clear('endDate');
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
              onChangeText={(v) => {
                setVenue(v);
                clear('venue');
              }}
              containerStyle={errors.venue ? styles.inputError : undefined}
            />
          </FormField>

          <FormField label="Organizer" error={errors.organizer}>
            <InputField
              icon="person-outline"
              placeholder="e.g. Executive Committee"
              value={organizer}
              onChangeText={(v) => {
                setOrganizer(v);
                clear('organizer');
              }}
              containerStyle={errors.organizer ? styles.inputError : undefined}
            />
          </FormField>

          <FormField label="Contact Number" error={errors.contact}>
            <InputField
              icon="call-outline"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              maxLength={16}
              value={contact}
              onChangeText={(v) => {
                setContact(v);
                clear('contact');
              }}
              containerStyle={errors.contact ? styles.inputError : undefined}
            />
          </FormField>

          <FormField label="Event Description" error={errors.description}>
            <View>
              <InputField
                placeholder="Write a detailed description about the event, activities, dress code, and other important information..."
                multiline
                maxLength={MAX_DESCRIPTION}
                value={description}
                onChangeText={(v) => {
                  setDescription(v);
                  clear('description');
                }}
                containerStyle={[styles.description, errors.description ? styles.inputError : undefined]}
                style={styles.descriptionInput}
              />
              <Text style={styles.counter}>
                {description.length}/{MAX_DESCRIPTION}
              </Text>
            </View>
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
              <Pressable
                style={[styles.upload, errors.image ? styles.uploadError : undefined]}
                onPress={pickImage}
                accessibilityRole="button"
              >
                <View style={styles.uploadIcon}>
                  <Ionicons name="image-outline" size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.uploadTitle}>Tap to upload event banner</Text>
                  <Text style={styles.uploadHint}>JPG, PNG up to 5 MB</Text>
                </View>
              </Pressable>
            )}
          </FormField>
        </ScrollView>

        <View style={styles.bottomBar}>
          <OutlineButton title="Save Draft" icon="save-outline" onPress={onSaveDraft} style={styles.barButton} />
          <PrimaryButton title="Next →" onPress={onNext} style={styles.barButton} />
        </View>
      </KeyboardAvoidingView>

      {iosPicker ? (
        <Modal transparent animationType="slide" onRequestClose={() => setIosPicker(null)}>
          <Pressable style={styles.backdrop} onPress={() => setIosPicker(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setIosPicker(null)} hitSlop={8}>
                <Text style={styles.sheetCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  iosPicker.onPick(iosPicker.value);
                  setIosPicker(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.sheetDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              mode={iosPicker.mode}
              value={iosPicker.value}
              display="spinner"
              onChange={(_, picked) => picked && setIosPicker((p) => (p ? { ...p, value: picked } : p))}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function FormField({
  label,
  error,
  required = true,
  style,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  style?: object;
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function PickerField({
  icon,
  placeholder,
  value,
  error,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  placeholder: string;
  value?: string;
  error?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.picker, error && styles.inputError]} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={MUTED_ICON} />
      <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]} numberOfLines={1}>
        {value ?? placeholder}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2, marginBottom: 16 },

  field: { marginBottom: 14 },
  label: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark, marginBottom: 6 },
  required: { color: ERROR },
  error: { fontFamily: fonts.regular, fontSize: 11, color: ERROR, marginTop: 4 },
  inputError: { borderColor: ERROR },
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

  picker: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pickerText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },
  pickerPlaceholder: { color: '#A89E94' },
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

  description: { minHeight: 100 },
  descriptionInput: { minHeight: 76, paddingBottom: 14 },
  counter: { position: 'absolute', right: 10, bottom: 6, fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  upload: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D9CBB8',
    backgroundColor: colors.card,
  },
  uploadError: { borderColor: ERROR },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark },
  uploadHint: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
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

  barButton: { flex: 1, width: 'auto' },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

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
