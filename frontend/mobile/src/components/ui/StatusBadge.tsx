import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { tones, type Tone, themedStyles } from '../../theme';
import type { BadgeStatus } from '../../types';
import Pill from './Pill';

// A function, so the tones follow the active theme (light / dark)
const palette = (): Record<BadgeStatus, Tone> => ({
  Upcoming: tones.success,
  Ongoing: tones.warning,
  Completed: tones.neutral,
  Important: tones.danger,
  General: tones.info,
  Featured: tones.info,
  Event: tones.sky,
  Meeting: tones.neutral,
  Other: tones.neutral,
  Open: tones.info,
  Confirmed: tones.success,
});

/** status: a known badge, or any text (e.g. a notice category the society added), shown in the neutral tone */
type Props = { status: BadgeStatus | (string & {}); style?: StyleProp<ViewStyle> };

export default function StatusBadge({ status, style }: Props) {
  return <Pill label={status} tone={palette()[status as BadgeStatus] ?? tones.neutral} style={[styles.badge, style]} />;
}

const styles = themedStyles(() => ({
  badge: { alignSelf: 'flex-start' },
}));
