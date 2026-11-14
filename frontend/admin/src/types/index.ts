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

export type MonthTotals = { month: string; donations: number; expenses: number };

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
