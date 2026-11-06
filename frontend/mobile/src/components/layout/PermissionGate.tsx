import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hasPermission, useAuth } from '../../context/AuthContext';
import { colors, fonts } from '../../theme';
import { Ionicons } from '../../icons';
import type { Permission } from '../../types';
import IconCircle from '../ui/IconCircle';

type Props = { permission: Permission; children: ReactNode };

/** Renders children only when the signed-in user has the given permission. */
export default function PermissionGate({ permission, children }: Props) {
  const { user } = useAuth();
  if (hasPermission(user, permission)) return <>{children}</>;

  return (
    <View style={styles.container}>
      <IconCircle size={72}>
        <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
      </IconCircle>
      <Text style={styles.text}>You don't have permission for this. Contact Super Admin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: 'center', maxWidth: 260 },
});
