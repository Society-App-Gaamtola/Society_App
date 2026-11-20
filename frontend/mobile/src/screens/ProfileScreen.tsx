import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import type { ProfileStackParamList, RootStackParamList } from '../navigation/types';
import { colors, fonts, PRIMARY_GRADIENT, tones, themedStyles } from '../theme';
import { canViewExpenses, useAuth } from '../context/AuthContext';
import { SOCIETY_NAME_GU } from '../config';
import { Ionicons, type IoniconName } from '../icons';
import { surface } from '../styles/common';
import { MONTHS } from '../utils/date';
import { AppHeader, IconCircle, Pill } from '../components';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import MenuGroup, { type MenuItem } from '../components/profile/MenuGroup';
import { setAppLanguage, t, useLanguage, useT } from '../i18n';
import { languages } from '../i18n/strings';

type Nav = NativeStackNavigationProp<ProfileStackParamList & RootStackParamList>;

const memberSinceLabel = (iso?: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? t('Member since {date}', { date: `${t(MONTHS[date.getMonth()])} ${date.getFullYear()}` }) : null;
};

type InfoRowProps = {
  icon: IoniconName;
  label: string;
  value?: string | null;
  badge?: React.ReactNode;
  /** Shown instead of a chevron when the row can't be changed. */
  locked?: boolean;
  onPress?: () => void;
};

function InfoRow({ icon, label, value, badge, locked, onPress }: InfoRowProps) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label}: ${value || 'Not added'}`}
    >
      <IconCircle size={36} radius={10} color={colors.noteBackground}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </IconCircle>
      <View style={styles.infoText}>
        <View style={styles.infoLabelRow}>
          <Text style={styles.infoLabel}>{t(label)}</Text>
          {badge}
        </View>
        <Text style={[styles.infoValue, !value && styles.infoEmpty]} numberOfLines={2}>
          {value || t('Not added')}
        </Text>
      </View>
      {locked ? (
        <Ionicons name="lock-closed-outline" size={16} color={colors.mutedIcon} />
      ) : onPress ? (
        <Ionicons name="create-outline" size={18} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const { user, signOut, refreshUser } = useAuth();
  const language = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  // Pick up changes made elsewhere (another device, the admin panel) whenever the tab opens.
  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => {});
    }, [refreshUser]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch {
      // The saved details stay on screen; the API client already reports expired logins.
    } finally {
      setRefreshing(false);
    }
  };

  const isExecutive = user?.role === 'executive';
  const phone = user?.mobile ? `${user.countryCode ?? ''} ${user.mobile}`.trim() : null;
  const memberSince = memberSinceLabel(user?.memberSince);
  const missingAddress = !user?.address?.trim();

  const accountItems: MenuItem[] = [
    {
      key: 'edit',
      label: 'Edit Profile',
      hint: 'Name, photo and address',
      icon: 'person-outline',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      key: 'email',
      label: 'Change Email',
      hint: user?.email ? `${t('Verified by OTP')} · ${user.email}` : 'Verified with a one-time code',
      icon: 'mail-outline',
      tone: tones.info,
      onPress: () => navigation.navigate('ChangeEmail'),
    },
    {
      key: 'password',
      label: 'Change Password',
      hint: 'Keep your account secure',
      icon: 'key-outline',
      tone: tones.warning,
      onPress: () => navigation.navigate('ChangePassword'),
    },
  ];

  // Changing it here switches the whole app at once (and the language of messages from the server)
  const languageItems: MenuItem[] = languages.map(({ code, native, label }) => ({
    key: `lang-${code}`,
    label: native,
    hint: code === 'en' ? undefined : label,
    icon: 'language-outline',
    tone: tones.info,
    trailing: language === code ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null,
    onPress: () => setAppLanguage(code).catch(() => {}),
  }));

  const societyItems: MenuItem[] = [
    {
      key: 'donations',
      label: 'My Donations',
      hint: 'History and receipts',
      icon: 'heart-outline',
      tone: tones.success,
      onPress: () => navigation.navigate('MyDonations'),
    },
    ...(!isExecutive
      ? [
          {
            key: 'executive',
            label: 'Executive Membership',
            hint: 'Request to join the committee',
            icon: 'ribbon-outline' as const,
            tone: tones.warning,
            onPress: () => navigation.navigate('ExecutiveRequest'),
          },
        ]
      : []),
    ...(canViewExpenses(user)
      ? [
          {
            key: 'expenses',
            label: 'Society Expenses',
            hint: 'Spending and balances',
            icon: 'wallet-outline' as const,
            tone: tones.sky,
            onPress: () => navigation.navigate('SocietyExpenses'),
          },
        ]
      : []),
  ];

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

  return (
    <View style={styles.screen}>
      <AppHeader rightIcons={[]} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Header card */}
        <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <ProfileAvatar name={user?.name} uri={user?.photoUrl} size={84} />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color={colors.primary} />
            </View>
          </Pressable>

          <View style={styles.heroText}>
            <Text style={styles.name} numberOfLines={2}>
              {user?.name || t('Guest')}
            </Text>
            <View style={styles.roleRow}>
              <View style={styles.rolePill}>
                <Ionicons name={isExecutive ? 'ribbon' : 'person'} size={11} color={colors.lightGold} />
                <Text style={styles.roleText}>{t(user?.roleLabel ?? 'Normal Member')}</Text>
              </View>
              {user?.memberId ? <Text style={styles.memberId}>{user.memberId}</Text> : null}
            </View>
            {memberSince ? <Text style={styles.since}>{memberSince}</Text> : null}
          </View>
        </LinearGradient>

        {/* Prompt to finish the profile */}
        {missingAddress ? (
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
            <View style={styles.flex}>
              <Text style={styles.bannerTitle}>{t('Complete your profile')}</Text>
              <Text style={styles.bannerText}>{t('Add your residential address so the committee can reach you.')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.warning} />
          </Pressable>
        ) : null}

        {/* Personal information */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('Personal Information')}</Text>
          <Pressable onPress={() => navigation.navigate('EditProfile')} hitSlop={8} accessibilityRole="button">
            <Text style={styles.sectionAction}>{t('Edit')}</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={user?.email}
            badge={
              user?.email && user.emailVerified !== undefined ? (
                <Pill
                  label={user.emailVerified ? 'Verified' : 'Not verified'}
                  tone={user.emailVerified ? tones.success : tones.warning}
                />
              ) : null
            }
            onPress={() => navigation.navigate('ChangeEmail')}
          />
          <View style={styles.divider} />
          <InfoRow icon="call-outline" label="Mobile Number" value={phone} locked />
          <View style={styles.divider} />
          <InfoRow
            icon="location-outline"
            label="Residential Address"
            value={user?.address}
            onPress={() => navigation.navigate('EditProfile')}
          />
        </View>

        <MenuGroup title="Account & Security" items={accountItems} />
        <MenuGroup title="Society" items={societyItems} />
        <MenuGroup title="Language" items={languageItems} />

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>{t('Logout')}</Text>
        </Pressable>

        <Text style={styles.footer}>{SOCIETY_NAME_GU}</Text>

      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(201, 162, 74, 0.18)',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  name: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.white },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232, 212, 162, 0.5)',
  },
  roleText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.lightGold },
  memberId: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255, 255, 255, 0.75)' },
  since: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255, 255, 255, 0.75)', marginTop: 6 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: tones.warning.bg,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
  },
  bannerTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  bannerText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8, marginHorizontal: 4 },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textMuted },
  sectionAction: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  card: { ...surface, borderRadius: 14, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 62 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  infoText: { flex: 1 },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  infoValue: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.textDark, marginTop: 1 },
  infoEmpty: { fontFamily: fonts.regular, color: colors.placeholder, fontStyle: 'italic' },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: tones.danger.bg,
  },
  logoutText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.danger },
  footer: { fontFamily: fonts.gujaratiRegular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16 },

}));
