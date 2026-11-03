import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { MOCK_USERS, useAuth } from '../auth/AuthContext';
import { OutlineButton } from '../components';
import ScreenPlaceholder from '../components/ScreenPlaceholder';

// Placeholder until the profile screen is designed.
export default function ProfileScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user, switchMockUser } = useAuth();

  return (
    <ScreenPlaceholder title="Profile">
      <OutlineButton
        title="Volunteer & Duties"
        onPress={() => navigation.navigate('Home', { screen: 'Volunteer' })}
        style={{ marginTop: 16 }}
      />
      <OutlineButton
        title="Executive Membership Request"
        onPress={() => navigation.navigate('Home', { screen: 'ExecutiveRequest' })}
      />
      <OutlineButton
        title="Society Expenses"
        onPress={() => navigation.navigate('Home', { screen: 'SocietyExpenses' })}
      />

      {__DEV__ ? (
        <View style={styles.dev}>
          <Text style={styles.devTitle}>DEV · Switch test user</Text>
          <View style={styles.devRow}>
            {MOCK_USERS.map((u) => {
              const active = user?.id === u.id;
              return (
                <Pressable
                  key={u.id}
                  onPress={() => switchMockUser(u.id)}
                  style={[styles.devOption, active && styles.devOptionActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.devName, active && styles.devTextActive]}>{u.name}</Text>
                  <Text style={[styles.devRole, active && styles.devTextActive]}>{u.role}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  dev: {
    alignSelf: 'stretch',
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gold,
  },
  devTitle: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  devRow: { flexDirection: 'row', gap: 8 },
  devOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  devOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  devName: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  devRole: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' },
  devTextActive: { color: colors.white },
});
