import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';
import { Ionicons } from '../../icons';
import IconCircle from '../ui/IconCircle';

type Props = { title: string; hint: string; error?: boolean; onPress: () => void };

/** Dashed tap target for choosing a file. */
export default function UploadBox({ title, hint, error, onPress }: Props) {
  return (
    <Pressable style={[styles.box, error && styles.error]} onPress={onPress} accessibilityRole="button">
      <IconCircle size={40} radius={8}>
        <Ionicons name="image-outline" size={22} color={colors.primary} />
      </IconCircle>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.dashedBorder,
    backgroundColor: colors.card,
  },
  error: { borderColor: colors.danger },
  title: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark },
  hint: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
});
