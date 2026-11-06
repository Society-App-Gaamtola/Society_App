import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, fonts } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';

type Props = TextInputProps & {
  icon?: IoniconName;
  /** Shows the error border. */
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const InputField = forwardRef<ComponentRef<typeof TextInput>, Props>(function InputField(
  { icon, error, secureTextEntry, multiline, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View
      style={[
        styles.container,
        multiline && styles.multiline,
        focused && styles.focused,
        error && styles.error,
        containerStyle,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={20} color={colors.mutedIcon} style={multiline ? styles.iconTop : styles.icon} />
      ) : null}
      <TextInput
        ref={ref}
        style={[styles.input, multiline && styles.inputMultiline, style]}
        placeholderTextColor={colors.placeholder}
        secureTextEntry={secureTextEntry && hidden}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {secureTextEntry ? (
        <Pressable
          onPress={() => setHidden((h) => !h)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        >
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.mutedIcon} />
        </Pressable>
      ) : null}
    </View>
  );
});

export default InputField;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  multiline: { height: undefined, minHeight: 110, alignItems: 'flex-start', paddingVertical: 12 },
  focused: { borderColor: colors.primary },
  error: { borderColor: colors.danger },
  icon: { marginRight: 10 },
  iconTop: { marginRight: 10, marginTop: 2 },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textDark,
    paddingVertical: 0,
  },
  inputMultiline: { height: undefined, minHeight: 86 },
});
