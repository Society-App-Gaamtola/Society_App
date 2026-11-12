import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, tones, type Language } from '../theme';
import { APP_VERSION, SOCIETY_NAME } from '../config';
import { useAuth } from '../context/AuthContext';
import { getAppLanguage, setAppLanguage } from '../i18n';
import { Ionicons } from '../icons';
import { AppHeader, OutlineButton } from '../components';
import MenuGroup, { type MenuItem } from '../components/profile/MenuGroup';

type Nav = NativeStackNavigationProp<HomeStackParamList & RootStackParamList>;

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
];

type AlertKey = 'events' | 'notices' | 'payments';
const ALERTS: { key: AlertKey; label: string; hint: string }[] = [
  { key: 'events', label: 'Event reminders', hint: 'Before events you may attend' },
  { key: 'notices', label: 'New notices', hint: 'When a notice is published' },
  { key: 'payments', label: 'Payment updates', hint: 'Donation receipts and status' },
];

const switchColors = { trackColor: { true: colors.primary, false: colors.border }, thumbColor: colors.white };

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();
  const [language, setLanguage] = useState<Language>(getAppLanguage());
  // Sample switches until notification preferences are saved on the server.
  const [alerts, setAlerts] = useState<Record<AlertKey, boolean>>({ events: true, notices: true, payments: true });

  const toggle = (key: AlertKey) => setAlerts((a) => ({ ...a, [key]: !a[key] }));

  const chooseLanguage = (code: Language) => {
    setLanguage(code);
    setAppLanguage(code).catch(() => {});
  };

  const logout = () =>
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);

  const account: MenuItem[] = [
    { key: 'profile', label: 'Edit Profile', hint: 'Name, address and photo', icon: 'person-outline', onPress: () => navigation.navigate('EditProfile') },
    { key: 'email', label: 'Change Email', hint: 'Verified with an OTP', icon: 'mail-outline', tone: tones.info, onPress: () => navigation.navigate('ChangeEmail') },
    { key: 'password', label: 'Change Password', hint: 'Keep your account secure', icon: 'key-outline', tone: tones.warning, onPress: () => navigation.navigate('ChangePassword') },
  ];

  const languages: MenuItem[] = LANGUAGES.map(({ code, label }) => ({
    key: code,
    label,
    icon: 'language-outline',
    trailing: language === code ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null,
    onPress: () => chooseLanguage(code),
  }));

  const notifications: MenuItem[] = ALERTS.map(({ key, label, hint }) => ({
    key,
    label,
    hint,
    icon: 'notifications-outline',
    tone: tones.success,
    trailing: <Switch value={alerts[key]} onValueChange={() => toggle(key)} {...switchColors} />,
    onPress: () => toggle(key),
  }));

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>Settings</Text>

        <MenuGroup title="Account" items={account} />
        <MenuGroup title="Language" items={languages} />
        <Text style={styles.hint}>Used for event names, categories and messages from the server.</Text>
        <MenuGroup title="Notifications" items={notifications} />

        <View style={styles.about}>
          <Text style={styles.aboutName}>{SOCIETY_NAME}</Text>
          <Text style={styles.aboutVersion}>{`Version ${APP_VERSION}`}</Text>
        </View>

        <OutlineButton title="Logout" icon="log-out-outline" onPress={logout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 4 },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: -4, marginBottom: 4, marginLeft: 2 },
  about: { alignItems: 'center', paddingVertical: 20 },
  aboutName: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  aboutVersion: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
