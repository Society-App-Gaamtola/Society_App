import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { tones, type Tone } from '../../theme';
import type { BadgeStatus } from '../../types';
import Pill from './Pill';

const palette: Record<BadgeStatus, Tone> = {
  Upcoming: tones.success,
  Important: tones.danger,
  General: tones.info,
  Featured: tones.info,
  Event: tones.sky,
  Meeting: tones.neutral,
  Other: tones.neutral,
  Assigned: tones.success,
  Open: tones.info,
  Confirmed: tones.success,
};

type Props = { status: BadgeStatus; style?: StyleProp<ViewStyle> };

export default function StatusBadge({ status, style }: Props) {
  return <Pill label={status} tone={palette[status]} style={[styles.badge, style]} />;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start' },
});
