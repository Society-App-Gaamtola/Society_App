import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '../../icons';
import { colors, fonts } from '../../theme';

const INACTIVE = '#E4DACD';

type Props = {
  steps: string[];
  /** 1-based number of the current step. */
  current: number;
};

/** Numbered steps joined by a line; finished steps show a tick. */
export default function StepIndicator({ steps, current }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${current} of ${steps.length}: ${steps[current - 1]}`}>
      {steps.map((label, i) => {
        const number = i + 1;
        const reached = number <= current;
        return (
          <Fragment key={label}>
            {i > 0 ? <View style={[styles.line, reached && styles.lineActive]} /> : null}
            <View style={styles.step}>
              <View style={[styles.circle, reached && styles.circleActive]}>
                {number < current ? (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                ) : (
                  <Text style={[styles.number, reached && styles.numberActive]}>{number}</Text>
                )}
              </View>
              <Text style={[styles.label, number === current && styles.labelActive]} numberOfLines={2}>
                {label}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

export const REGISTER_STEPS = ['Personal Details', 'Verify OTP', 'Profile & Address'];

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 8 },
  step: { alignItems: 'center', width: 84 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: INACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: { backgroundColor: colors.primary },
  number: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textMuted },
  numberActive: { color: colors.white },
  line: { flex: 1, height: 1.5, backgroundColor: INACTIVE, marginTop: 14, marginHorizontal: -28 },
  lineActive: { backgroundColor: colors.primary },
  label: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  labelActive: { fontFamily: fonts.semiBold, color: colors.primary },
});
