import { useMemo } from 'react';
import { createBottomTabNavigator, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SideDrawerProvider } from '../components/layout/SideDrawer';
import { useAuth } from '../context/AuthContext';
import { Ionicons, MaterialCommunityIcons, type IoniconName } from '../icons';
import { colors, fonts } from '../theme';
import type {
  DonateStackParamList,
  EventsStackParamList,
  HomeStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  SharedStackParams,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const DonateStack = createNativeStackNavigator<DonateStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const stackOptions = { headerShown: false, contentStyle: { backgroundColor: colors.background } };

/** Screens pushed inside both the Home and Events tabs. Each one loads the first time it opens. */
const SHARED_SCREENS: { name: keyof SharedStackParams; getComponent: () => React.ComponentType<any> }[] = [
  { name: 'NoticeBoard', getComponent: () => require('../screens/NoticeBoardScreen').default },
  { name: 'EventCalendar', getComponent: () => require('../screens/EventCalendarScreen').default },
  { name: 'ExecutiveRequest', getComponent: () => require('../screens/ExecutiveRequestScreen').default },
  { name: 'SocietyExpenses', getComponent: () => require('../screens/SocietyExpensesScreen').default },
  { name: 'Settings', getComponent: () => require('../screens/SettingsScreen').default },
  { name: 'EditProfile', getComponent: () => require('../screens/EditProfileScreen').default },
  { name: 'ChangePassword', getComponent: () => require('../screens/ChangePasswordScreen').default },
  { name: 'ChangeEmail', getComponent: () => require('../screens/ChangeEmailScreen').default },
  { name: 'CreateEvent', getComponent: () => require('../screens/CreateEventScreen').default },
  { name: 'MyEvents', getComponent: () => require('../screens/MyEventsScreen').default },
  { name: 'EventPreview', getComponent: () => require('../screens/EventPreviewScreen').default },
  { name: 'DonationEntries', getComponent: () => require('../screens/DonationEntriesScreen').default },
  { name: 'AddDonation', getComponent: () => require('../screens/AddDonationScreen').default },
  { name: 'FinancialReports', getComponent: () => require('../screens/FinancialReportsScreen').default },
  { name: 'ExportReports', getComponent: () => require('../screens/ExportReportsScreen').default },
  { name: 'NoticeDetails', getComponent: () => require('../screens/NoticeDetailsScreen').default },
  { name: 'EventDetails', getComponent: () => require('../screens/EventDetailsScreen').default },
  { name: 'Notifications', getComponent: () => require('../screens/NotificationsScreen').default },
  { name: 'NotificationDetails', getComponent: () => require('../screens/NotificationDetailsScreen').default },
  { name: 'MyDonations', getComponent: () => require('../screens/MyDonationsScreen').default },
  { name: 'MemberDirectory', getComponent: () => require('../screens/MemberDirectoryScreen').default },
];

/** Executives get their dashboard on the Home tab; members get the regular home. */
function HomeMain() {
  const { user } = useAuth();
  const Screen =
    user?.role === 'executive'
      ? require('../screens/ExecutiveDashboardScreen').default
      : require('../screens/HomeScreen').default;
  return <Screen />;
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeMain} />
      {SHARED_SCREENS.map((screen) => (
        <HomeStack.Screen key={screen.name} name={screen.name} getComponent={screen.getComponent} />
      ))}
    </HomeStack.Navigator>
  );
}

function EventsStackScreen() {
  return (
    <EventsStack.Navigator screenOptions={stackOptions}>
      <EventsStack.Screen name="EventsMain" getComponent={() => require('../screens/EventsScreen').default} />
      {SHARED_SCREENS.map((screen) => (
        <EventsStack.Screen key={screen.name} name={screen.name} getComponent={screen.getComponent} />
      ))}
    </EventsStack.Navigator>
  );
}

/** Donate has its own stack, so My Donations opened from it returns to it on Back. */
function DonateStackScreen() {
  return (
    <DonateStack.Navigator screenOptions={stackOptions}>
      <DonateStack.Screen name="DonateMain" getComponent={() => require('../screens/DonateScreen').default} />
      {SHARED_SCREENS.map((screen) => (
        <DonateStack.Screen key={screen.name} name={screen.name} getComponent={screen.getComponent} />
      ))}
    </DonateStack.Navigator>
  );
}

/** Profile has its own stack, so screens opened from it return to it on Back. */
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={stackOptions}>
      <ProfileStack.Screen name="ProfileMain" getComponent={() => require('../screens/ProfileScreen').default} />
      {SHARED_SCREENS.map((screen) => (
        <ProfileStack.Screen key={screen.name} name={screen.name} getComponent={screen.getComponent} />
      ))}
    </ProfileStack.Navigator>
  );
}

const tabIcon = (name: IoniconName): BottomTabNavigationOptions => ({
  tabBarIcon: ({ color, size }) => <Ionicons name={name} size={size} color={color} />,
});

const HOME_OPTIONS = tabIcon('home-outline');
const EVENTS_OPTIONS = tabIcon('calendar-outline');
const GALLERY_OPTIONS = tabIcon('image-outline');
const PROFILE_OPTIONS = tabIcon('person-outline');
const DONATE_OPTIONS: BottomTabNavigationOptions = {
  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hand-coin-outline" size={size} color={color} />,
};

export default function MainTabs() {
  const { bottom } = useSafeAreaInsets();
  const screenOptions = useMemo<BottomTabNavigationOptions>(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedIcon,
      tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      tabBarStyle: {
        backgroundColor: colors.white,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 64 + bottom,
        paddingTop: 6,
        paddingBottom: 8 + bottom,
      },
      sceneStyle: { backgroundColor: colors.background },
    }),
    [bottom],
  );

  return (
    <SideDrawerProvider>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen name="Home" component={HomeStackScreen} options={HOME_OPTIONS} />
        <Tab.Screen name="Events" component={EventsStackScreen} options={EVENTS_OPTIONS} />
        <Tab.Screen name="Gallery" getComponent={() => require('../screens/GalleryScreen').default} options={GALLERY_OPTIONS} />
        <Tab.Screen name="Donate" component={DonateStackScreen} options={DONATE_OPTIONS} />
        <Tab.Screen name="Profile" component={ProfileStackScreen} options={PROFILE_OPTIONS} />
      </Tab.Navigator>
    </SideDrawerProvider>
  );
}
