import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { hasPermission, useAuth, type Permission } from '../auth/AuthContext';

type Props = { permission: Permission; children: ReactNode };

/** Renders children only when the signed-in user has the given permission. */
export default function PermissionGate({ permission, children }: Props) {
  const { user } = useAuth();
  if (hasPermission(user, permission)) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
      </View>
      <Text style={styles.text}>You don't have permission for this. Contact Super Admin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 20, color: colors.textMuted, textAlign: 'center', maxWidth: 260 },
});
