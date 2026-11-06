import type { ImageSourcePropType } from 'react-native';
import type { IoniconName } from '../icons';

// --- Auth

export type Permission = 'events' | 'notices' | 'donations' | 'expenses' | 'reports' | 'media';
export type Permissions = Record<Permission, boolean>;

export type AuthUser = {
  id: string;
  name: string;
  memberId: string;
  role: 'member' | 'executive';
  permissions: Permissions;
  /** When true, events this user posts go to the admin for approval first. */
  eventsNeedApproval: boolean;
  email?: string;
  countryCode?: string;
  mobile?: string;
  address?: string | null;
  photoUrl?: string | null;
  /** False until the Profile & Address step is done. */
  profileComplete?: boolean;
};

// --- Shared

export type BadgeStatus =
  | 'Upcoming'
  | 'Important'
  | 'General'
  | 'Featured'
  | 'Event'
  | 'Meeting'
  | 'Other'
  | 'Assigned'
  | 'Open'
  | 'Confirmed';

/** Inclusive ISO date range (yyyy-mm-dd). */
export type DateRange = { start: string; end: string };

// --- Society events and notices

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
  icon: IoniconName;
};

export type CalendarEntry = {
  /** ISO date, used as the calendar key. */
  date: string;
  title: string;
  time: string;
  venue: string;
  category: EventCategory;
  eventId: string;
};

export type Duty = {
  id: string;
  title: string;
  icon: IoniconName;
  date: string;
  venue: string;
  category: EventCategory;
  status: 'Assigned' | 'Open' | 'Confirmed';
};

// --- Executive events

export type ExecEventStatus = 'Draft' | 'Posted' | 'Scheduled' | 'Needs Approval';

export type ExecEvent = {
  id: string;
  ownerId: string;
  title: string;
  /** Display date, e.g. "10 Oct 2026". */
  date: string;
  /** Optional last day for multi-day events. */
  endDate?: string;
  time?: string;
  venue: string;
  organizer?: string;
  contact?: string;
  category: EventCategory;
  description?: string;
  imageUri?: string;
  status: ExecEventStatus;
  /** Publish time for scheduled events (ms since epoch). */
  scheduledAt?: number;
  createdAt: number;
};

export type NewExecEvent = Omit<ExecEvent, 'id' | 'ownerId' | 'createdAt'>;

// --- Donations

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
export type DonationStatus = 'Verified' | 'Pending' | 'Draft';
export type DonationPurpose = 'Festival' | 'Aarti' | 'Cultural' | 'General Fund' | 'Other';

export type Donation = {
  id: string;
  donorName: string;
  memberId: string;
  /** ISO date-time of the donation. */
  date: string;
  mode: PaymentMode;
  amount: number;
  status: DonationStatus;
  reference?: string;
  purpose?: DonationPurpose;
  note?: string;
  receipt?: { name: string; uri: string; mimeType?: string };
};

export type NewDonation = Omit<Donation, 'id'>;

// --- Reports

export type ReportFormat = 'PDF' | 'Excel';
export type ReportType = 'Donation Summary' | 'Transaction History' | 'Member-wise Report';

export type Report = {
  id: string;
  title: string;
  period: string;
  generatedOn: string;
  format: ReportFormat;
  /** Local file of a generated report; seed entries have none. */
  fileUri?: string;
};

// --- Finance

export type ExpenseCategory = {
  id: string;
  title: string;
  icon: IoniconName;
  spent: number;
  budget: number;
};

export type Transaction = {
  id: string;
  date: string;
  title: string;
  note: string;
  amount: number;
  status: 'Completed';
};
