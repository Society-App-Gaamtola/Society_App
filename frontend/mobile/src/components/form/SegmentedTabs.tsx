import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, spacing } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';

type Props<T extends string> = {
  /** [value, label, optional icon] for each tab. */
  tabs: readonly (readonly [T, string, IoniconName?])[];
  selected: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

/** Row of equal-width tabs; the selected one is filled. */
export default function SegmentedTabs<T extends string>({ tabs, selected, onSelect, style }: Props<T>) {
  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {tabs.map(([value, label, icon]) => {
        const active = value === selected;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {icon ? <Ionicons name={icon} size={16} color={active ? colors.white : colors.textDark} /> : null}
            <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#EFEAE4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { backgroundColor: colors.primary },
  text: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },
  textActive: { color: colors.white },
});
