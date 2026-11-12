import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { surface } from '../../styles/common';
import { colors, fonts } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  /** Optional square button beside the search box. */
  actionIcon?: IoniconName;
  actionLabel?: string;
  onActionPress?: () => void;
};

export default function SearchBar({
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  inputRef,
  actionIcon,
  actionLabel,
  onActionPress,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.row}>
      <View style={[styles.search, focused && styles.searchFocused]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedIcon} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          returnKeyType="search"
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.mutedIcon} />
          </Pressable>
        ) : null}
      </View>
      {actionIcon ? (
        <Pressable style={styles.action} onPress={onActionPress} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Ionicons name={actionIcon} size={20} color={colors.textDark} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  search: {
    ...surface,
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchFocused: { borderColor: colors.primary },
  input: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 13, color: colors.textDark, padding: 0 },
  action: {
    ...surface,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
