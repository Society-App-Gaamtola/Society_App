import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { common } from '../styles/common';
import { colors, fonts, tones, type Language, themedStyles } from '../theme';
import { APP_VERSION } from '../config';
import { useAppInfo } from '../services/appInfo';
import { getNotificationSettings, saveNotificationSettings, type NotificationSettings } from '../api/user';
import { showToast } from '../utils/toast';
import { useAuth } from '../context/AuthContext';
import { setAppLanguage, useLanguage, useT } from '../i18n';
import { languages as LANGUAGE_LIST } from '../i18n/strings';
import { Ionicons } from '../icons';
import { AppHeader, OutlineButton } from '../components';
import MenuGroup, { type MenuItem } from '../components/profile/MenuGroup';

type Nav = NativeStackNavigationProp<HomeStackParamList & RootStackParamList>;

const LANGUAGES: { code: Language; label: string }[] = LANGUAGE_LIST.map(({ code, native }) => ({ code, label: native }));

type AlertKey = keyof NotificationSettings;
const ALERTS: { key: AlertKey; label: string; hint: string }[] = [
  { key: 'events', label: 'New events', hint: 'When an event is posted' },
  { key: 'notices', label: 'New notices', hint: 'When a notice is published' },
  { key: 'payments', label: 'Payment updates', hint: 'Donation receipts and status' },
];

const switchColors = () => ({ trackColor: { true: colors.primary, false: colors.border }, thumbColor: colors.white });

export default function SettingsScreen() {
  const t = useT();
  const { society_name: societyName } = useAppInfo();
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();
  const language = useLanguage();
  // Saved on the server (GET / PUT /user/notification-settings): a type switched off is no longer delivered
  const [alerts, setAlerts] = useState<NotificationSettings>({ events: true, notices: true, payments: true });
  useEffect(() => {
    getNotificationSettings()
      .then(({ data }) => setAlerts(data.settings))
      .catch(() => {});
  }, []);

  // Switches at once, then saves; put back when the save fails
  const toggle = (key: AlertKey) => {
    const value = !alerts[key];
    setAlerts((a) => ({ ...a, [key]: value }));
    saveNotificationSettings({ [key]: value })
      .then(({ data }) => setAlerts(data.settings))
      .catch((e) => {
        setAlerts((a) => ({ ...a, [key]: !value }));
        showToast(e instanceof Error ? e.message : t('Please try again.'));
      });
  };

  const chooseLanguage = (code: Language) => {
    setAppLanguage(code).catch(() => {});
  };

  const logout = () =>
    Alert.alert(t('Logout'), t('Are you sure you want to logout?'), [
      { text: t('Cancel'), style: 'cancel' },
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
    trailing: <Switch value={alerts[key]} onValueChange={() => toggle(key)} {...switchColors()} />,
    onPress: () => toggle(key),
  }));

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>{t('Settings')}</Text>

        <MenuGroup title="Account" items={account} />
        <MenuGroup title="Language" items={languages} />
        <Text style={styles.hint}>{t('The whole app, categories and messages from the server switch at once.')}</Text>
        <MenuGroup title="Notifications" items={notifications} />

        <View style={styles.about}>
          <Text style={styles.aboutName}>{societyName}</Text>
          <Text style={styles.aboutVersion}>{`Version ${APP_VERSION}`}</Text>
        </View>

        <OutlineButton title="Logout" icon="log-out-outline" onPress={logout} />
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { padding: 16, paddingBottom: 32, gap: 4 },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: -4, marginBottom: 4, marginLeft: 2 },
  about: { alignItems: 'center', paddingVertical: 20 },
  aboutName: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  aboutVersion: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
}));
