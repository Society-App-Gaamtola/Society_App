import { forwardRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

type Props = TextInputProps & {
  icon?: ComponentProps<typeof Ionicons>['name'];
  containerStyle?: StyleProp<ViewStyle>;
};

const ICON_COLOR = '#9A8F86';
const PLACEHOLDER_COLOR = '#A89E94';

const InputField = forwardRef<ComponentRef<typeof TextInput>, Props>(function InputField(
  { icon, secureTextEntry, multiline, containerStyle, style, onFocus, onBlur, ...rest },
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
        containerStyle,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={20} color={ICON_COLOR} style={multiline ? styles.iconTop : styles.icon} />
      ) : null}
      <TextInput
        ref={ref}
        style={[styles.input, multiline && styles.inputMultiline, style]}
        placeholderTextColor={PLACEHOLDER_COLOR}
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
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={ICON_COLOR} />
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
