import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  autoFocus?: boolean;
};

/** Row of single-digit boxes; handles auto-advance, backspace and pasting a full code. */
export default function OtpInput({ length = 6, value, onChange, autoFocus }: Props) {
  const inputs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focus = (i: number) => inputs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const handleChange = (index: number, text: string) => {
    const typed = text.replace(/\D/g, '');
    const next = [...digits];

    if (typed.length > 1) {
      // Pasted or autofilled code: spread it from this box onwards.
      const chars = typed.slice(0, length - index).split('');
      chars.forEach((c, k) => (next[index + k] = c));
      onChange(next.join(''));
      focus(index + chars.length);
      return;
    }

    next[index] = typed;
    onChange(next.join(''));
    if (typed && index < length - 1) focus(index + 1);
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace' || digits[index] || index === 0) return;
    const next = [...digits];
    next[index - 1] = '';
    onChange(next.join(''));
    focus(index - 1);
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          value={digit}
          onChangeText={(t) => handleChange(i, t)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused((f) => (f === i ? null : f))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={i === 0 ? 'sms-otp' : 'off'}
          autoFocus={autoFocus && i === 0}
          selectTextOnFocus
          maxLength={i === 0 ? length : 1}
          style={[styles.box, focused === i && styles.boxFocused]}
          accessibilityLabel={`Digit ${i + 1} of ${length}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    maxWidth: 46,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    textAlign: 'center',
    fontFamily: fonts.semiBold,
    fontSize: 20,
    color: colors.textDark,
    padding: 0,
  },
  boxFocused: { borderColor: colors.primary },
});
