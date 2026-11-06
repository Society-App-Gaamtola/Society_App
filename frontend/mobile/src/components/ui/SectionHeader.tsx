import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, fonts } from '../../theme';

type Props = {
  title: string;
  onViewAll?: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export default function SectionHeader({ title, onViewAll, icon, style, titleStyle }: Props) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.titleRow}>
        {icon}
        <Text style={[styles.title, titleStyle]}>{title}</Text>
      </View>
      {onViewAll ? (
        <Pressable onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAll}>View All →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark },
  viewAll: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
});
