import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import type { EventsStackParamList, HomeStackParamList, MainTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import ExecutiveDashboardScreen from '../screens/ExecutiveDashboardScreen';
import { useAuth } from '../auth/AuthContext';
import EventsScreen from '../screens/EventsScreen';
import GalleryScreen from '../screens/GalleryScreen';
import DonateScreen from '../screens/DonateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NoticeBoardScreen from '../screens/NoticeBoardScreen';
import NoticeDetailsScreen from '../screens/NoticeDetailsScreen';
import EventCalendarScreen from '../screens/EventCalendarScreen';
import VolunteerScreen from '../screens/VolunteerScreen';
import ExecutiveRequestScreen from '../screens/ExecutiveRequestScreen';
import SocietyExpensesScreen from '../screens/SocietyExpensesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import MyEventsScreen from '../screens/MyEventsScreen';
import EventPreviewScreen from '../screens/EventPreviewScreen';
import DonationEntriesScreen from '../screens/DonationEntriesScreen';
import AddDonationScreen from '../screens/AddDonationScreen';
import FinancialReportsScreen from '../screens/FinancialReportsScreen';
import ExportReportsScreen from '../screens/ExportReportsScreen';
import { SideDrawerProvider } from '../components/SideDrawer';
import EventDetailsScreen from '../screens/EventDetailsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();

const INACTIVE = '#9A8F86';
const stackOptions = { headerShown: false, contentStyle: { backgroundColor: colors.background } };

/** Executives get their dashboard on the Home tab; members get the regular home. */
function HomeMain() {
  const { user } = useAuth();
  return user?.role === 'executive' ? <ExecutiveDashboardScreen /> : <HomeScreen />;
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeMain} />
      <HomeStack.Screen name="NoticeBoard" component={NoticeBoardScreen} />
      <HomeStack.Screen name="EventCalendar" component={EventCalendarScreen} />
      <HomeStack.Screen name="Volunteer" component={VolunteerScreen} />
      <HomeStack.Screen name="ExecutiveRequest" component={ExecutiveRequestScreen} />
      <HomeStack.Screen name="SocietyExpenses" component={SocietyExpensesScreen} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} />
      <HomeStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <HomeStack.Screen name="MyEvents" component={MyEventsScreen} />
      <HomeStack.Screen name="EventPreview" component={EventPreviewScreen} />
      <HomeStack.Screen name="DonationEntries" component={DonationEntriesScreen} />
      <HomeStack.Screen name="AddDonation" component={AddDonationScreen} />
      <HomeStack.Screen name="FinancialReports" component={FinancialReportsScreen} />
      <HomeStack.Screen name="ExportReports" component={ExportReportsScreen} />
      <HomeStack.Screen name="NoticeDetails" component={NoticeDetailsScreen} />
      <HomeStack.Screen name="EventDetails" component={EventDetailsScreen} />
    </HomeStack.Navigator>
  );
}

function EventsStackScreen() {
  return (
    <EventsStack.Navigator screenOptions={stackOptions}>
      <EventsStack.Screen name="EventsMain" component={EventsScreen} />
      <EventsStack.Screen name="NoticeBoard" component={NoticeBoardScreen} />
      <EventsStack.Screen name="EventCalendar" component={EventCalendarScreen} />
      <EventsStack.Screen name="Volunteer" component={VolunteerScreen} />
      <EventsStack.Screen name="ExecutiveRequest" component={ExecutiveRequestScreen} />
      <EventsStack.Screen name="SocietyExpenses" component={SocietyExpensesScreen} />
      <EventsStack.Screen name="Settings" component={SettingsScreen} />
      <EventsStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <EventsStack.Screen name="MyEvents" component={MyEventsScreen} />
      <EventsStack.Screen name="EventPreview" component={EventPreviewScreen} />
      <EventsStack.Screen name="DonationEntries" component={DonationEntriesScreen} />
      <EventsStack.Screen name="AddDonation" component={AddDonationScreen} />
      <EventsStack.Screen name="FinancialReports" component={FinancialReportsScreen} />
      <EventsStack.Screen name="ExportReports" component={ExportReportsScreen} />
      <EventsStack.Screen name="NoticeDetails" component={NoticeDetailsScreen} />
      <EventsStack.Screen name="EventDetails" component={EventDetailsScreen} />
    </EventsStack.Navigator>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <SideDrawerProvider>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Events"
        component={EventsStackScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="image-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Donate"
        component={DonateScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hand-coin-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
    </SideDrawerProvider>
  );
}
