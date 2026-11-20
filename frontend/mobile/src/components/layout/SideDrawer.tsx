import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LOGO, SOCIETY_NAME_GU } from '../../config';
import { canViewExpenses, hasPermission, useAuth } from '../../context/AuthContext';
import { Ionicons, type IoniconName } from '../../icons';
import { getAppInfo, type ApiAppInfo, type SocialNetwork } from '../../api/user';
import type { HomeStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, fonts, themedStyles } from '../../theme';
import { useT } from '../../i18n';

type DrawerContextValue = { open: () => void };

const DrawerContext = createContext<DrawerContextValue | null>(null);

/** Returns null outside the main tabs, where there is no drawer. */
export const useSideDrawer = () => useContext(DrawerContext);

type LinkTarget = keyof HomeStackParamList;
type DrawerLink = {
  label: string;
  icon: IoniconName;
  target: LinkTarget;
  hidden?: boolean;
};

const ANIMATION_MS = 220;

export function SideDrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(
    (after?: () => void) => {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        after?.();
      });
    },
    [progress],
  );

  useEffect(() => {
    if (!visible) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => close()}>
        <DrawerPanel progress={progress} onClose={close} />
      </Modal>
    </DrawerContext.Provider>
  );
}

const SOCIAL_ICON: Record<SocialNetwork, IoniconName> = {
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  x: 'logo-x',
  youtube: 'logo-youtube',
};
const SOCIAL_LABEL: Record<SocialNetwork, string> = { facebook: 'Facebook', instagram: 'Instagram', x: 'X', youtube: 'YouTube' };

function DrawerPanel({ progress, onClose }: { progress: Animated.Value; onClose: (after?: () => void) => void }) {
  const t = useT();
  // The society's pages (admin panel → App Settings → Social Networking), read each time the menu opens,
  // so a changed link is used at once
  const [social, setSocial] = useState<ApiAppInfo['social_links']>([]);
  useEffect(() => {
    getAppInfo()
      .then(({ data }) => setSocial(data.social_links))
      .catch(() => {});
  }, []);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuth();
  const panelWidth = Math.min(width * 0.8, 320);

  const isExecutive = user?.role === 'executive';
  const links: DrawerLink[] = [
    { label: isExecutive ? 'Executive Dashboard' : 'Home', icon: 'home-outline', target: 'HomeMain' },
    { label: 'Notifications', icon: 'notifications-outline', target: 'Notifications' },
    { label: 'Event Calendar', icon: 'calendar-outline', target: 'EventCalendar' },
    { label: 'Notice Board', icon: 'megaphone-outline', target: 'NoticeBoard' },
    { label: 'My Donations', icon: 'heart-outline', target: 'MyDonations' },
    { label: 'Member Directory', icon: 'people-outline', target: 'MemberDirectory' },
    { label: 'My Events', icon: 'calendar-number-outline', target: 'MyEvents', hidden: !hasPermission(user, 'events') },
    { label: 'My Notices', icon: 'document-text-outline', target: 'MyNotices', hidden: !hasPermission(user, 'notices') },
    { label: 'Media Approval', icon: 'images-outline', target: 'MediaApproval', hidden: !hasPermission(user, 'media') },
    // Executives already have the role
    { label: 'Executive Request', icon: 'ribbon-outline', target: 'ExecutiveRequest', hidden: isExecutive },
    { label: 'Donation Entries', icon: 'cash-outline', target: 'DonationEntries', hidden: !hasPermission(user, 'donations') },
    { label: 'Financial Reports', icon: 'bar-chart-outline', target: 'FinancialReports', hidden: !hasPermission(user, 'reports') },
    { label: 'Society Expenses', icon: 'wallet-outline', target: 'SocietyExpenses', hidden: !canViewExpenses(user) },
    { label: 'Settings', icon: 'settings-outline', target: 'Settings' },
  ];

  const go = (target: LinkTarget) =>
    onClose(() =>
      // Every link lives in the Home tab's stack so the tab bar stays visible.
      navigation.navigate('Main', {
        screen: 'Home',
        params: target === 'HomeMain' ? { screen: 'HomeMain' } : { screen: target as 'Settings' },
      }),
    );

  const logout = () =>
    Alert.alert(t('Logout'), t('Are you sure you want to logout?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Logout'),
        style: 'destructive',
        onPress: () =>
          onClose(async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }),
      },
    ]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onClose()} accessibilityLabel="Close menu" />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }],
          },
        ]}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.logoCircle}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.name}>{user?.name ?? t('Guest')}</Text>
          {user ? <Text style={styles.memberType}>{t(user.roleLabel)}</Text> : null}
          {user?.memberId ? <Text style={styles.memberId}>{t('Member ID: {id}', { id: user.memberId })}</Text> : null}
        </View>

        <ScrollView contentContainerStyle={styles.links}>
          {links
            .filter((l) => !l.hidden)
            .map((link) => (
              <Pressable
                key={link.target}
                onPress={() => go(link.target)}
                style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
                accessibilityRole="button"
              >
                <Ionicons name={link.icon} size={20} color={colors.primary} />
                <Text style={styles.linkText}>{t(link.label)}</Text>
              </Pressable>
            ))}

          {social.length ? (
            <View style={styles.social}>
              <Text style={styles.socialTitle}>{t('Follow us')}</Text>
              <View style={styles.socialRow}>
                {social.map((link) => (
                  <Pressable
                    key={link.network}
                    onPress={() => Linking.openURL(link.url).catch(() => {})}
                    style={({ pressed }) => [styles.socialButton, pressed && styles.linkPressed]}
                    accessibilityRole="link"
                    accessibilityLabel={SOCIAL_LABEL[link.network]}
                    hitSlop={6}
                  >
                    <Ionicons name={SOCIAL_ICON[link.network]} size={22} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          <Pressable
            onPress={logout}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.linkText, styles.logoutText]}>{t('Logout')}</Text>
          </Pressable>
        </ScrollView>

        <Text style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>{SOCIETY_NAME_GU}</Text>
      </Animated.View>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdropStrong },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  logo: { width: 60, height: 60 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  memberType: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.lightGold, marginTop: 2 },
  memberId: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  links: { paddingVertical: 8 },
  social: { paddingHorizontal: 20, paddingTop: 10 },
  socialTitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  linkPressed: { backgroundColor: colors.tint },
  linkText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark },
  logoutText: { color: colors.danger },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginVertical: 8 },
  footer: {
    fontFamily: fonts.gujaratiRegular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: 8,
  },
}));
