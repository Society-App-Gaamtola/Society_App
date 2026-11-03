import type { ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import type { BadgeStatus } from '../components/StatusBadge';

export type EventCategory = 'Festival' | 'Aarti' | 'Cultural' | 'Meeting';

export type SocietyEvent = {
  id: string;
  title: string;
  date: string;
  days?: string;
  time?: string;
  venue: string;
  category: EventCategory;
  status: BadgeStatus;
  image: ImageSourcePropType;
  organizer: string;
  contact: string;
  latitude: number;
  longitude: number;
  description: string;
};

export type Notice = {
  id: string;
  title: string;
  date: string;
  description: string;
  tag: BadgeStatus;
  icon: ComponentProps<typeof Ionicons>['name'];
};

const ORGANIZER = 'Executive Committee';
const CONTACT = '+91 98765 43210';

export const events: SocietyEvent[] = [
  {
    id: 'e1',
    title: 'Navratri Garba Mahotsav',
    date: '10 Oct 2026 - 14 Oct 2026',
    days: '5 Days',
    time: '7:00 PM - 10:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Festival',
    status: 'Upcoming',
    image: require('../../assets/event1.jpg'),
    organizer: ORGANIZER,
    contact: CONTACT,
    latitude: 22.3072,
    longitude: 73.1812,
    description:
      'Join us for five nights of traditional Garba and Dandiya with live music, aarti every evening and prizes for the best-dressed participants. All members and their families are welcome.',
  },
  {
    id: 'e2',
    title: 'Janmashtami Celebration',
    date: '26 Aug 2026, 8:00 PM',
    venue: 'Temple Premises, Vadodara',
    category: 'Festival',
    status: 'Upcoming',
    image: require('../../assets/event2.jpg'),
    organizer: ORGANIZER,
    contact: CONTACT,
    latitude: 22.3105,
    longitude: 73.1868,
    description:
      'Celebrate the birth of Lord Krishna with bhajans, Matki Phod, cradle ceremony at midnight and prasad distribution.',
  },
  {
    id: 'e3',
    title: 'Ganesh Chaturthi',
    date: '10 Sep 2026, 8:00 AM',
    venue: 'Temple Premises, Vadodara',
    category: 'Festival',
    status: 'Upcoming',
    image: require('../../assets/event3.jpg'),
    organizer: ORGANIZER,
    contact: CONTACT,
    latitude: 22.3105,
    longitude: 73.1868,
    description:
      'Ganpati sthapana with morning puja, daily aarti and cultural programmes through the festival, ending with a grand visarjan procession.',
  },
  {
    id: 'e4',
    title: 'Aarti & Bhajan Sandhya',
    date: '12 Oct 2026, 7:30 PM',
    venue: 'Society Community Hall, Vadodara',
    category: 'Aarti',
    status: 'Upcoming',
    image: require('../../assets/event4.jpg'),
    organizer: ORGANIZER,
    contact: CONTACT,
    latitude: 22.3049,
    longitude: 73.1795,
    description: 'An evening of devotional bhajans by local artists followed by maha aarti and prasad.',
  },
  {
    id: 'e5',
    title: 'Cultural Programme',
    date: '20 Oct 2026, 6:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Cultural',
    status: 'Featured',
    image: require('../../assets/event5.jpg'),
    organizer: ORGANIZER,
    contact: CONTACT,
    latitude: 22.3072,
    longitude: 73.1812,
    description:
      'Folk dance, drama and music performances by children and youth of the society. Register with the committee to participate.',
  },
  {
    id: 'e6',
    title: 'Annual General Meeting',
    date: '25 Oct 2026, 10:00 AM',
    venue: 'Community Hall, Vadodara',
    category: 'Meeting',
    status: 'Meeting',
    image: require('../../assets/event6.jpg'),
    organizer: ORGANIZER,
    contact: CONTACT,
    latitude: 22.3049,
    longitude: 73.1795,
    description:
      'Annual review of society accounts and activities, election of committee members and planning for next year. All members are requested to attend.',
  },
];

export const notices: Notice[] = [
  {
    id: 'n1',
    title: 'Navratri Garba Practice Schedule',
    date: '10 Oct 2026',
    description: 'Practice sessions from 12 Oct to 14 Oct. All members are requested to attend.',
    tag: 'Important',
    icon: 'megaphone-outline',
  },
  {
    id: 'n2',
    title: 'Society Meeting Notice',
    date: '08 Oct 2026',
    description: 'General body meeting will be held on 15 Oct 2026 at 11:00 AM in the community hall.',
    tag: 'General',
    icon: 'document-text-outline',
  },
  {
    id: 'n3',
    title: 'Donation Appeal',
    date: '05 Oct 2026',
    description: 'We request all members to contribute generously for the upcoming cultural programmes.',
    tag: 'Important',
    icon: 'alert-circle-outline',
  },
  {
    id: 'n4',
    title: 'Janmashtami Celebration Details',
    date: '01 Oct 2026',
    description: 'Event details, schedule and participation information are now available.',
    tag: 'Event',
    icon: 'flower-outline',
  },
  {
    id: 'n5',
    title: 'Water Supply Disruption',
    date: '28 Sep 2026',
    description: 'Due to maintenance work, water supply will be disrupted on 29 Sep 2026 from 9 AM to 2 PM.',
    tag: 'General',
    icon: 'water-outline',
  },
  {
    id: 'n6',
    title: 'New Member Registration Open',
    date: '26 Sep 2026',
    description: 'Registration for new members is now open. Please visit the member section for details.',
    tag: 'Other',
    icon: 'person-add-outline',
  },
];

export type CalendarEntry = {
  /** ISO date, used as the calendar key. */
  date: string;
  title: string;
  time: string;
  venue: string;
  category: EventCategory;
  eventId: string;
};

export const calendarEvents: CalendarEntry[] = [
  {
    date: '2026-10-07',
    title: 'Navratri Garba Mahotsav',
    time: '7:00 PM - 10:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Festival',
    eventId: 'e1',
  },
  {
    date: '2026-10-10',
    title: 'Sharad Purnima Aarti',
    time: '7:30 PM - 9:00 PM',
    venue: 'Temple Premises, Vadodara',
    category: 'Aarti',
    eventId: 'e4',
  },
  {
    date: '2026-10-15',
    title: 'Aarti & Bhajan Sandhya',
    time: '6:30 PM - 8:00 PM',
    venue: 'Temple Premises, Vadodara',
    category: 'Cultural',
    eventId: 'e5',
  },
  {
    date: '2026-10-22',
    title: 'Annual General Meeting',
    time: '10:00 AM - 12:00 PM',
    venue: 'Community Hall, Vadodara',
    category: 'Meeting',
    eventId: 'e6',
  },
];

export type Duty = {
  id: string;
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  date: string;
  venue: string;
  category: EventCategory;
  status: 'Assigned' | 'Open' | 'Confirmed';
};

export const duties: Duty[] = [
  {
    id: 'd1',
    title: 'Welcome Desk',
    icon: 'people-outline',
    date: '8 Oct 2026, 6:00 PM - 8:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Festival',
    status: 'Assigned',
  },
  {
    id: 'd2',
    title: 'Stage Arrangement',
    icon: 'grid-outline',
    date: '9 Oct 2026, 5:00 PM - 7:00 PM',
    venue: 'Temple Premises, Vadodara',
    category: 'Cultural',
    status: 'Assigned',
  },
  {
    id: 'd3',
    title: 'Prasad Distribution',
    icon: 'restaurant-outline',
    date: '9 Oct 2026, 6:00 PM - 9:30 PM',
    venue: 'Temple Premises, Vadodara',
    category: 'Aarti',
    status: 'Assigned',
  },
  {
    id: 'd4',
    title: 'Sound & Lights',
    icon: 'volume-high-outline',
    date: '9 Oct 2026, 6:00 PM - 8:00 PM',
    venue: 'Temple Premises, Vadodara',
    category: 'Festival',
    status: 'Open',
  },
];

export const myAssignments: Duty[] = [
  {
    id: 'a1',
    title: 'Welcome Desk',
    icon: 'people-outline',
    date: '7 Oct 2026, 6:00 PM - 8:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Festival',
    status: 'Confirmed',
  },
];

export const financeSummary = {
  totalIncome: 125000,
  totalExpenses: 42500,
  availableBalance: 82500,
};

export type ExpenseCategory = {
  id: string;
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  spent: number;
  budget: number;
};

export const expenseBreakdown: ExpenseCategory[] = [
  { id: 'x1', title: 'Festival', icon: 'sparkles-outline', spent: 22000, budget: 40000 },
  { id: 'x2', title: 'Decorations', icon: 'flower-outline', spent: 8500, budget: 15000 },
  { id: 'x3', title: 'Prasad', icon: 'restaurant-outline', spent: 6000, budget: 10000 },
  { id: 'x4', title: 'Sound & Lights', icon: 'volume-high-outline', spent: 5000, budget: 12000 },
];

export type Transaction = {
  id: string;
  date: string;
  title: string;
  note: string;
  amount: number;
  status: 'Completed';
};

export const transactions: Transaction[] = [
  { id: 't1', date: '05 Oct 2026', title: 'Festival', note: 'Decoration items', amount: 8500, status: 'Completed' },
  { id: 't2', date: '03 Oct 2026', title: 'Prasad', note: 'Prasad items', amount: 6000, status: 'Completed' },
  { id: 't3', date: '02 Oct 2026', title: 'Sound & Lights', note: 'Sound system rental', amount: 5000, status: 'Completed' },
  { id: 't4', date: '28 Sep 2026', title: 'Festival', note: 'Stage decoration', amount: 12000, status: 'Completed' },
];
