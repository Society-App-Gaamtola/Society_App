import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';

type Props = { icon: IoniconName; text?: string };

/** Small icon and a single line of muted text, used for dates and venues on cards. */
export default function MetaRow({ icon, text }: Props) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={12} color={colors.mutedIcon} />
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
});
