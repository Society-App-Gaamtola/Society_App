import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts } from '../theme';

export type BadgeStatus =
  | 'Upcoming'
  | 'Important'
  | 'General'
  | 'Featured'
  | 'Event'
  | 'Meeting'
  | 'Other'
  | 'Assigned'
  | 'Open'
  | 'Confirmed';

const palette: Record<BadgeStatus, { text: string; bg: string }> = {
  Upcoming: { text: '#1E8E4E', bg: '#E6F6EC' },
  Important: { text: '#C62828', bg: '#FDECEC' },
  General: { text: '#1E63C6', bg: '#E8F0FC' },
  Featured: { text: '#1E63C6', bg: '#E8F0FC' },
  Event: { text: '#0A84B5', bg: '#E5F5FB' },
  Meeting: { text: '#6B6B6B', bg: '#F0EEEC' },
  Other: { text: '#6B6B6B', bg: '#F0EEEC' },
  Assigned: { text: '#1E8E4E', bg: '#E6F6EC' },
  Open: { text: '#1E63C6', bg: '#E8F0FC' },
  Confirmed: { text: '#1E8E4E', bg: '#E6F6EC' },
};

type Props = { status: BadgeStatus; style?: StyleProp<ViewStyle> };

export default function StatusBadge({ status, style }: Props) {
  const { text, bg } = palette[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  text: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },
});
