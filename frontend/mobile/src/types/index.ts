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
  /** The member type shown under the name: 'Normal Member', 'Executive Member' or 'Super Admin' (English; t() it) */
  roleLabel: string;
  permissions: Permissions;
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
  /** Who runs the event and a number to call, when the creator filled them in. */
  organizer?: string | null;
  contact?: string | null;
  /** All image links of the event, for the carousel on the details screen. */
  images?: string[];
  /** Venue pin for the map preview. */
  coords?: { latitude: number; longitude: number } | null;
  venueName?: string;
  address?: string | null;
};

export type Notice = {
  id: string;
  title: string;
  date: string;
  description: string;
  /** The event the notice is about, if any (its venue and map link go into a shared notice) */
  eventId?: string | null;
  /** Important / General / Event, or a category the society added (shown as typed) */
  tag: BadgeStatus | (string & {});
  icon: IoniconName;
};

// --- Notifications and member donations

export type NotificationKind = 'event' | 'notice' | 'payment' | 'general';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  /** What it is about, so the details screen can open it. */
  refType?: 'event' | 'notice' | 'media' | null;
  refId?: string | null;
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
  status: 'Successful' | 'Pending' | 'Failed';
  icon: McIconName;
  method: DonationMethod;
  /** UPI transaction ID (UTR) or receipt number. */
  reference?: string;
};


export type DirectoryMember = {
  id: string;
  name: string;
  /** Society member code; empty until the admin assigns one. */
  memberId: string;
  role: 'Admin' | 'Executive' | 'Member';
  photoUrl: string | null;
  /** Null when the member keeps it private (executives and the admin always see it). */
  mobile: string | null;
  email: string | null;
};

// --- Executive events

/** The Create Event form, carried to the preview and saved through POST / PUT /user/events */
export type EventDraft = {
  title: string;
  categoryId: number;
  /** In the app's language, for the preview */
  categoryName: string;
  /** yyyy-mm-dd */
  day: string;
  /** yyyy-mm-dd, for a multi-day event */
  endDay?: string;
  /** HH:mm */
  time: string;
  venue: string;
  organizer: string;
  contact: string;
  description: string;
  /** A photo picked on the phone (uploaded when saved) or the event's poster link */
  imageUri?: string;
  /** A new event made from an Event Planning plan (the plan is marked "Event Created") */
  planId?: number;
};

// --- Donations

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
export type DonationStatus = 'Verified' | 'Pending' | 'Rejected';
export type DonationPurpose = 'Festival' | 'Aarti' | 'Cultural' | 'General Fund' | 'Other';

/** A donation entry from GET /admin/donations (the Donations section), ready to display */
export type Donation = {
  id: string;
  donorName: string;
  /** The member code, or '-' for a donor who isn't a member */
  memberId: string;
  /** yyyy-mm-dd */
  date: string;
  mode: PaymentMode;
  amount: number;
  status: DonationStatus;
  reference?: string;
  /** One of the society's donation purposes (App Settings) */
  purpose?: string;
  note?: string;
  proofUrl?: string | null;
};


// --- Reports

export type ReportFormat = 'PDF' | 'Excel';
export type ReportType = 'Donation Summary' | 'Transaction History' | 'Member-wise Report' | 'Expense Report' | 'Income & Expense Summary';

/** A report someone generated (GET /admin/reports): the file is built again on the phone when opened */
export type Report = {
  id: number;
  type: ReportType;
  /** yyyy-mm-dd; null = all dates */
  range: DateRange | null;
  period: string;
  generatedOn: string;
  generatedBy?: string | null;
};
