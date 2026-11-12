import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { surface } from '../../styles/common';
import { colors, fonts, type Tone } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';
import IconCircle from '../ui/IconCircle';

export type MenuItem = {
  key: string;
  label: string;
  /** Second line under the label. */
  hint?: string;
  icon: IoniconName;
  tone?: Tone;
  /** Shown on the right, before the chevron. */
  trailing?: ReactNode;
  onPress: () => void;
};

type Props = { title?: string; items: MenuItem[] };

/** A titled card of tappable rows, like a settings list. */
export default function MenuGroup({ title, items }: Props) {
  if (!items.length) return null;
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.card}>
        {items.map((item, index) => (
          <Fragment key={item.key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={item.onPress}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={item.hint}
            >
              <IconCircle size={38} radius={10} color={item.tone?.bg ?? colors.tint}>
                <Ionicons name={item.icon} size={19} color={item.tone?.text ?? colors.primary} />
              </IconCircle>
              <View style={styles.text}>
                <Text style={styles.label}>{item.label}</Text>
                {item.hint ? (
                  <Text style={styles.hint} numberOfLines={1}>
                    {item.hint}
                  </Text>
                ) : null}
              </View>
              {item.trailing}
              <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
            </Pressable>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 20 },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { ...surface, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 60 },
  pressed: { backgroundColor: colors.softTint },
  text: { flex: 1 },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
});
