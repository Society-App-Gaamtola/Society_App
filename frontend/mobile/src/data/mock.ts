// Sample data for screens that have no API yet: finance, notifications, donations, gallery and members.
import type { AppNotification, DirectoryMember, ExpenseCategory, GalleryPhoto, MyDonation, Transaction } from '../types';

export const galleryPhotos: GalleryPhoto[] = [
  { id: 'g1', image: require('../../assets/event3.jpg'), caption: 'Diwali Rangoli Competition', category: 'Festival', date: '09 Nov 2026' },
  { id: 'g2', image: require('../../assets/event1.jpg'), caption: 'Navratri Maha Aarti', category: 'Aarti', date: '12 Oct 2026' },
  { id: 'g3', image: require('../../assets/event2.jpg'), caption: 'Ganesh Sthapana', category: 'Festival', date: '07 Sep 2026' },
  { id: 'g4', image: require('../../assets/onboarding-festivals.jpg'), caption: 'Garba Night', category: 'Cultural', date: '14 Oct 2026' },
  { id: 'g5', image: require('../../assets/onboarding-community.jpg'), caption: 'Annual General Meeting', category: 'Meeting', date: '22 Oct 2026' },
  { id: 'g6', image: require('../../assets/event4.jpg'), caption: 'Sharad Purnima Aarti', category: 'Aarti', date: '15 Oct 2026' },
];

export const directoryMembers: DirectoryMember[] = [
  { id: 'dm1', name: 'Dhaval Patel', memberId: 'GYMM-0042', role: 'Executive', mobile: '+91 98765 43210' },
  { id: 'dm2', name: 'Sejal Kothari', memberId: 'GYMM-0023', role: 'Executive', mobile: '+91 98250 11223' },
  { id: 'dm3', name: 'Ramesh Patel', memberId: 'GYMM-1024', role: 'Member', mobile: '+91 98765 43211' },
  { id: 'dm4', name: 'Ketan Thakkar', memberId: 'GYMM-0045', role: 'Member', mobile: '+91 99099 45678' },
  { id: 'dm5', name: 'Pooja Gandhi', memberId: 'GYMM-0032', role: 'Member', mobile: '+91 97234 56789' },
  { id: 'dm6', name: 'Nita Patel', memberId: 'GYMM-0249', role: 'Member', mobile: '+91 98980 12345' },
  { id: 'dm7', name: 'Hitesh Shah', memberId: 'GYMM-0118', role: 'Member', mobile: '+91 90990 87654' },
  { id: 'dm8', name: 'Kavita Desai', memberId: 'GYMM-0076', role: 'Member', mobile: '+91 94260 33445' },
];

const NAVRATRI = { date: '12 Oct 2026 (Monday)', time: '7:00 PM - 10:00 PM', venue: 'Society Premises, Vadodara' };

export const notifications: AppNotification[] = [
  {
    id: 'nt1',
    kind: 'event',
    title: 'Navratri event reminder',
    body: "Garba Mahotsav is happening tomorrow at 7:00 PM. Don't miss the celebration!",
    message:
      'Dear Member,\n\nNavratri Garba Mahotsav is happening tomorrow at our society premises. Please be there and join the celebration with your family and friends.',
    time: 'Today, 8:45 AM',
    icon: 'calendar-outline',
    unread: true,
    event: NAVRATRI,
  },
  {
    id: 'nt2',
    kind: 'notice',
    title: 'New notice published',
    body: 'Society meeting notice has been published for all members.',
    message: 'Dear Member,\n\nA new notice about the society meeting has been published. Please read it on the Notice Board.',
    time: 'Yesterday, 6:20 PM',
    icon: 'document-text-outline',
    unread: true,
  },
  {
    id: 'nt3',
    kind: 'payment',
    title: 'Donation payment successful',
    body: 'Your donation of ₹5,001 has been received. Thank you for your support!',
    message: 'Dear Member,\n\nYour donation of ₹5,001 for Navratri Mahotsav has been received. You can download the receipt from My Donations.',
    time: '18 Oct 2026, 4:32 PM',
    icon: 'cash-outline',
    unread: true,
  },
  {
    id: 'nt5',
    kind: 'notice',
    title: 'Water supply update',
    body: 'Water supply will be unavailable today from 10 AM to 2 PM for maintenance.',
    message: 'Dear Member,\n\nWater supply will be unavailable today from 10 AM to 2 PM because of tank maintenance. Please store water in advance.',
    time: '16 Oct 2026, 7:40 PM',
    icon: 'water-outline',
    unread: false,
  },
  {
    id: 'nt6',
    kind: 'event',
    title: 'Event time changed',
    body: 'Cultural programme time has been updated to 6:30 PM (earlier 6:00 PM).',
    message: 'Dear Member,\n\nThe Cultural Programme will now start at 6:30 PM instead of 6:00 PM. The venue is unchanged.',
    time: '14 Oct 2026, 5:25 PM',
    icon: 'time-outline',
    unread: false,
    event: { date: '20 Oct 2026 (Tuesday)', time: '6:30 PM - 9:00 PM', venue: 'Society Premises, Vadodara' },
  },
];

export const myDonations: MyDonation[] = [
  { id: 'md1', title: 'Navratri Mahotsav', date: '2026-10-12T16:32:00', amount: 5001, status: 'Successful', icon: 'temple-hindu', method: 'UPI App', reference: '628714503921' },
  { id: 'md2', title: 'Society General Fund', date: '2026-08-05T11:20:00', amount: 5000, status: 'Successful', icon: 'account-group', method: 'QR Code', reference: '621903377410' },
  { id: 'md3', title: 'Ganesh Chaturthi', date: '2026-01-22T18:15:00', amount: 5000, status: 'Successful', icon: 'hand-heart', method: 'Cash', reference: 'RCPT-0112' },
  { id: 'md4', title: 'Diwali Celebration', date: '2025-11-01T10:05:00', amount: 2500, status: 'Successful', icon: 'lamp', method: 'Card', reference: 'pay_P8xK2LmQ' },
];

export const financeSummary = {
  totalIncome: 125000,
  totalExpenses: 42500,
  availableBalance: 82500,
};

export const expenseBreakdown: ExpenseCategory[] = [
  { id: 'x1', title: 'Festival', icon: 'sparkles-outline', spent: 22000, budget: 40000 },
  { id: 'x2', title: 'Decorations', icon: 'flower-outline', spent: 8500, budget: 15000 },
  { id: 'x3', title: 'Prasad', icon: 'restaurant-outline', spent: 6000, budget: 10000 },
  { id: 'x4', title: 'Sound & Lights', icon: 'volume-high-outline', spent: 5000, budget: 12000 },
];

export const transactions: Transaction[] = [
  { id: 't1', date: '05 Oct 2026', title: 'Festival', note: 'Decoration items', amount: 8500, status: 'Completed' },
  { id: 't2', date: '03 Oct 2026', title: 'Prasad', note: 'Prasad items', amount: 6000, status: 'Completed' },
  { id: 't3', date: '02 Oct 2026', title: 'Sound & Lights', note: 'Sound system rental', amount: 5000, status: 'Completed' },
  { id: 't4', date: '28 Sep 2026', title: 'Festival', note: 'Stage decoration', amount: 12000, status: 'Completed' },
];
