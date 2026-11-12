import type { ImageSourcePropType } from 'react-native';
import type { IoniconName, McIconName } from '../icons';

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
  /** True once the email was confirmed with an OTP. */
  emailVerified?: boolean;
  /** ISO date the account was created. */
  memberSince?: string | null;
};

// --- Shared

export type BadgeStatus =
  | 'Upcoming'
  | 'Ongoing'
  | 'Completed'
  | 'Important'
  | 'General'
  | 'Featured'
  | 'Event'
  | 'Meeting'
  | 'Other'
  | 'Open'
  | 'Confirmed';

/** Inclusive ISO date range (yyyy-mm-dd). */
export type DateRange = { start: string; end: string };

// --- Society events and notices

export type EventCategory = 'Festival' | 'Aarti' | 'Cultural' | 'Meeting';

/** An event from the API, ready to display (`toSocietyEvent` in api/user.ts). */
export type SocietyEvent = {
  id: string;
  title: string;
  /** Display date, e.g. "13 Nov 2026, 7:00 PM" or "08 Nov 2026 - 10 Nov 2026". */
  date: string;
  days?: string;
  time?: string;
  venue: string;
  /** First and last day, yyyy-mm-dd (the same for one-day events). */
  startDay: string;
  endDay: string;
  /** Category name in the app's language. */
  category: string;
  categoryColor: string;
  status: BadgeStatus;
  image: ImageSourcePropType;
  description: string;
  mapLink: string | null;
};

export type Notice = {
  id: string;
  title: string;
  date: string;
  description: string;
  tag: BadgeStatus;
  icon: IoniconName;
};

// --- Notifications and member donations (sample data until their APIs exist)

export type NotificationKind = 'event' | 'notice' | 'payment';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  /** Short text for the list. */
  body: string;
  /** Full message on the details screen. */
  message: string;
  /** Display time, e.g. "Today, 8:45 AM". */
  time: string;
  icon: IoniconName;
  unread: boolean;
  /** Date, time and venue rows for event alerts. */
  event?: { date: string; time: string; venue: string };
};

export type DonationMethod = 'UPI App' | 'QR Code' | 'Card' | 'Net Banking' | 'Cash';

export type MyDonation = {
  id: string;
  title: string;
  /** ISO date-time. */
  date: string;
  amount: number;
  /** Pending until the treasurer matches it with the bank statement or cash book. */
  status: 'Successful' | 'Pending';
  icon: McIconName;
  method: DonationMethod;
  /** UPI transaction ID (UTR) or receipt number. */
  reference?: string;
};

export type GalleryPhoto = {
  id: string;
  image: ImageSourcePropType;
  caption: string;
  category: EventCategory;
  /** Display date, e.g. "12 Oct 2026". */
  date: string;
  /** Uploaded by this user and waiting for the Super Admin to approve it. */
  pending?: boolean;
};

export type DirectoryMember = {
  id: string;
  name: string;
  memberId: string;
  role: 'Executive' | 'Member';
  /** Shown to executives only (privacy setting in the PPT). */
  mobile: string;
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
