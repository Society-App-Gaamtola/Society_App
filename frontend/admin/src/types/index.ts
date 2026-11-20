export type Id = number | string;

export type BaseRecord = {
  id: Id;
  created_at: string;
  updated_at: string;
};

/** Fields the server or service layer fills in. */
export type NewRecord<T extends BaseRecord> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
export const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Cash', 'Bank Transfer', 'Cheque'];

export type ReviewStatus = 'Verified' | 'Pending' | 'Rejected';
export const REVIEW_STATUSES: ReviewStatus[] = ['Verified', 'Pending', 'Rejected'];

export type PublishStatus = 'Published' | 'Draft';
export const PUBLISH_STATUSES: PublishStatus[] = ['Published', 'Draft'];

export type Member = BaseRecord & {
  memberId: string;
  name: string;
  mobile: string;
  email: string;
  type: 'Executive' | 'Normal';
  status: 'Active' | 'Inactive';
  address: string;
  joinedOn: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  photo?: string | null;
  notes?: string;
};

export type Event = BaseRecord & {
  title: string;
  date: string;
  endDate: string | null;
  time: string;
  venue: string;
  category: string;
  status: PublishStatus;
  featured?: boolean;
  organizer: string;
  contact: string;
  latitude: number;
  longitude: number;
  description: string;
  image: string | null;
};

export type Notice = BaseRecord & {
  title: string;
  date: string;
  description: string;
  tag: string;
  icon: string;
  status: PublishStatus;
};

export type Donation = BaseRecord & {
  donorName: string;
  memberId: string;
  amount: number;
  mode: PaymentMode;
  purpose: string;
  reference: string;
  date: string;
  status: ReviewStatus;
  /** Uploaded payment proof. */
  receipt?: string | null;
};

export type Expense = BaseRecord & {
  description: string;
  vendor: string;
  category: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  status: ReviewStatus;
  approvedBy: string;
  receipt?: string | null;
};

export type ExecutiveRequest = BaseRecord & {
  memberName: string;
  memberId: string;
  contact: string;
  donationReference: string;
  reason: string;
  paymentProof: string | null;
  documents?: { name: string; url: string | null }[];
  status: 'Pending review' | 'Approved' | 'Rejected';
  submittedOn: string;
  rejectionReason?: string;
};

export const PERMISSION_KEYS = ['events', 'notices', 'donations', 'expenses', 'reports', 'media', 'settings'] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type ExecutivePermission = BaseRecord &
  Record<PermissionKey, boolean> & {
    memberId: string;
    eventsNeedApproval: boolean;
  };

export type MediaItem = BaseRecord & {
  title: string;
  album: string;
  type: 'image' | 'video';
  url: string | null;
  uploadedBy: string;
  uploaderName?: string;
  uploadedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
};

export type ReportType = 'summary' | 'donation' | 'expense' | 'category' | 'monthly' | 'custom';

export type Report = BaseRecord & {
  title: string;
  type: ReportType;
  period: string;
  from: string | null;
  to: string | null;
  category: string;
  mode: string;
  generatedOn: string;
};

export type AuditLog = BaseRecord & {
  actor: string;
  action: string;
  target: string;
  at: string;
};

export type VolunteerDuty = BaseRecord & { title: string; date: string; time: string; venue: string; category: string; status: string };
export type Assignment = BaseRecord & { dutyId: Id; memberId: string; status: string; date: string };

export type AppSettings = BaseRecord & {
  societyName: string;
  contactEmail: string;
  phone: string;
  address: string;
  logo: string | null;
  showGujaratiName: boolean;
  MIN_EXECUTIVE_DONATION: number;
  allowRegistration: boolean;
  enableEventNotifications: boolean;
  allowUploads: boolean;
  requireMediaApproval: boolean;
  notifyNewMember: boolean;
  notifyDonation: boolean;
  notifyExecutiveRequest: boolean;
  notifyMediaUpload: boolean;
  eventCategories: string[];
  donationPurposes: string[];
  expenseCategories: string[];
  noticeTags: string[];
};

export type DateRange = { from?: string; to?: string };

/** key = "YYYY-MM"; month = the short axis label ("Nov", or "Nov '26" across years) */
export type MonthTotals = { key: string; month: string; donations: number; expenses: number };

export type Transaction = {
  key: string;
  kind: 'Donation' | 'Expense';
  date: string;
  description: string;
  category: string;
  mode: PaymentMode;
  amount: number;
  status: ReviewStatus;
  href: string;
};

export type FinanceSummary = {
  totalDonations: number;
  totalExpenses: number;
  balance: number;
  transactions: number;
  /** Percent change against the previous period of the same length; null without a full date range. */
  donationTrend: number | null;
  expenseTrend: number | null;
  monthly: MonthTotals[];
  recent: Transaction[];
};

export type DashboardStats = FinanceSummary & {
  totalMembers: number;
  executives: number;
  activeEvents: number;
  totalNotices: number;
  pendingApprovals: number;
  pendingDonations: number;
  pendingExpenses: number;
  pendingRequests: number;
  pendingMedia: number;
  activities: AuditLog[];
};

// ---------- Backend (connected screens) ----------

export type MemberRole = 'super_admin' | 'executive' | 'member';

/** A member as GET /admin/members returns it */
export type AdminMember = {
  id: number;
  member_code: string | null;
  name: string | null;
  email: string;
  country_code: string;
  mobile: string;
  role: MemberRole;
  status: 'active' | 'suspended';
  signup: 'otp_pending' | 'profile_pending' | 'completed';
  is_verified: 0 | 1;
  address: string | null;
  photo_url: string | null;
  joined_on: string;
  last_login_at: string | null;
};

export type MemberDonation = {
  id: number;
  amount: number;
  purpose: string | null;
  method: string;
  status: string;
  reference_no: string | null;
  created_at: string;
  confirmed_at: string | null;
};

/** GET /admin/members/:id */
export type AdminMemberDetails = {
  member: AdminMember;
  donations: { confirmed_count: number; confirmed_total: number; recent: MemberDonation[] };
};

export type EventStatusCode = 'draft' | 'scheduled' | 'posted' | 'cancelled';

/** An event as GET /user/events?manage=true returns it (management view) */
export type BackendEvent = {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string | null;
  venue_name: string;
  venue_address: string | null;
  map_link: string | null;
  poster_url: string | null;
  images: string[];
  organizer_name: string | null;
  contact_number: string | null;
  latitude: number | null;
  longitude: number | null;
  is_featured: 0 | 1;
  event_status: 'upcoming' | 'ongoing' | 'completed';
  category: { id: number; code: string; name: string; color: string };
  status: EventStatusCode;
  publish_at: string | null;
  posted_at: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type EventCategory = { id: number; code: string; name: string; color: string };

export type NoticeStatusCode = 'draft' | 'published';
export type NoticeTag = 'important' | 'general' | 'event';

/** A notice as GET /user/notices?manage=true returns it */
export type BackendNotice = {
  id: number;
  title: string;
  body: string;
  tag: NoticeTag;
  event_id: number | null;
  status: NoticeStatusCode;
  audience: 'all' | 'selected';
  published_at: string | null;
  recipient_count: number;
  recipient_ids?: number[];
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export const PERMISSION_SECTIONS = ['events', 'notices', 'donations', 'expenses', 'reports', 'media', 'settings'] as const;
export type PermissionSection = (typeof PERMISSION_SECTIONS)[number];
export type ExecutivePermissions = { sections: PermissionSection[] };

/** GET /admin/executives: a member with the executive role, plus their permissions */
export type AdminExecutive = AdminMember & { permissions: ExecutivePermissions };

/** GET /executive/executive-requests */
export type BackendExecutiveRequest = {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  donation_amount: number;
  reference_no: string;
  reason: string;
  payment_proof_url: string | null;
  review_note: string | null;
  donation_id: number | null;
  donation_status: string | null;
  user_id: number;
  full_name: string | null;
  email: string;
  mobile: string;
  role: MemberRole;
  created_at: string;
  reviewed_at: string | null;
};
