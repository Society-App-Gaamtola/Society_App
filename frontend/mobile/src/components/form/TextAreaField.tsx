import { StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { colors, fonts } from '../../theme';
import InputField from './InputField';

type Props = Omit<TextInputProps, 'value' | 'multiline' | 'maxLength' | 'style'> & {
  value: string;
  maxLength: number;
  minHeight: number;
  error?: boolean;
};

const VERTICAL_PADDING = 24;

/** Multi-line input with a character counter in its corner. */
export default function TextAreaField({ value, maxLength, minHeight, ...rest }: Props) {
  return (
    <View>
      <InputField
        {...rest}
        value={value}
        multiline
        maxLength={maxLength}
        containerStyle={{ minHeight }}
        style={{ minHeight: minHeight - VERTICAL_PADDING, paddingBottom: 14 }}
      />
      <Text style={styles.counter}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { position: 'absolute', right: 10, bottom: 6, fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
});
