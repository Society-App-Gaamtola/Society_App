import type { AuthUser, Donation, ExecEvent, Permissions, Report } from '../types';

// Sample data shown until the matching API is connected.

const NO_PERMISSIONS: Permissions = {
  events: false,
  notices: false,
  donations: false,
  expenses: false,
  reports: false,
  media: false,
};

export const MOCK_USERS: AuthUser[] = [
  {
    id: 'm1',
    name: 'Ramesh Patel',
    memberId: 'GYMM-1024',
    role: 'member',
    permissions: NO_PERMISSIONS,
    eventsNeedApproval: false,
  },
  {
    id: 'm2',
    name: 'Dhaval Patel',
    memberId: 'GYMM-0042',
    role: 'executive',
    permissions: { events: true, notices: true, donations: true, expenses: false, reports: true, media: true },
    eventsNeedApproval: true,
  },
];

// Owned by the mock executive.
export const SEED_EXEC_EVENTS: ExecEvent[] = [
  {
    id: 'x-seed-1',
    ownerId: 'm2',
    title: 'Navratri Garba Mahotsav',
    date: '10 Oct 2026',
    time: '7:00 PM - 10:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Festival',
    status: 'Posted',
    createdAt: Date.parse('2026-09-20'),
  },
  {
    id: 'x-seed-2',
    ownerId: 'm2',
    title: 'Diwali Rangoli Competition',
    date: '08 Nov 2026',
    time: '4:00 PM - 7:00 PM',
    venue: 'Society Premises, Vadodara',
    category: 'Cultural',
    status: 'Needs Approval',
    createdAt: Date.parse('2026-10-25'),
  },
  {
    id: 'x-seed-3',
    ownerId: 'm2',
    title: 'Sharad Purnima Raas',
    date: '25 Oct 2026',
    venue: 'Temple Premises, Vadodara',
    category: 'Festival',
    status: 'Draft',
    createdAt: Date.parse('2026-10-28'),
  },
];

export const SEED_DONATIONS: Donation[] = [
  { id: 'd-seed-1', donorName: 'Dhaval Patel', memberId: 'GM001', date: '2026-10-12T10:30:00', mode: 'UPI', amount: 1001, status: 'Verified' },
  { id: 'd-seed-2', donorName: 'Sejal Kothari', memberId: 'GM003', date: '2026-10-11T17:45:00', mode: 'Cash', amount: 501, status: 'Verified' },
  { id: 'd-seed-3', donorName: 'Ramesh Patel', memberId: 'GM018', date: '2026-10-10T16:20:00', mode: 'Bank Transfer', amount: 2500, status: 'Pending' },
  { id: 'd-seed-4', donorName: 'Ketan Thakkar', memberId: 'GM045', date: '2026-10-10T09:15:00', mode: 'UPI', amount: 1101, status: 'Verified' },
  { id: 'd-seed-5', donorName: 'Pooja Gandhi', memberId: 'GM032', date: '2026-10-10T14:10:00', mode: 'Cash', amount: 251, status: 'Verified' },
];

export const SEED_REPORTS: Report[] = [
  {
    id: 'r1',
    title: 'Monthly Report - October 2026',
    period: '01 Oct 2026 - 31 Oct 2026',
    generatedOn: '14 Oct 2026, 05:30 PM',
    format: 'PDF',
  },
  {
    id: 'r2',
    title: 'Monthly Report - September 2026',
    period: '01 Sep 2026 - 30 Sep 2026',
    generatedOn: '01 Oct 2026, 11:20 AM',
    format: 'PDF',
  },
  {
    id: 'r3',
    title: 'Donation Summary - Q3 2026',
    period: '01 Jul 2026 - 30 Sep 2026',
    generatedOn: '01 Oct 2026, 10:15 AM',
    format: 'Excel',
  },
];
