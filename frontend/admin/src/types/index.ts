export type Id = number | string;

export type BaseRecord = {
  id: Id;
  created_at: string;
  updated_at: string;
};

/** Fields the server or service layer fills in. */
export type NewRecord<T extends BaseRecord> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

export type Member = BaseRecord & {
  memberId: string;
  name: string;
  mobile: string;
  email: string;
  type: 'Executive' | 'Normal';
  status: 'Active' | 'Inactive';
  address: string;
  joinedOn: string;
};

export type Event = BaseRecord & {
  title: string;
  date: string;
  endDate: string | null;
  time: string;
  venue: string;
  category: 'Festival' | 'Aarti' | 'Cultural' | 'Meeting';
  status: string;
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
  tag: 'Important' | 'General' | 'Event' | 'Other';
  icon: string;
};

export type Donation = BaseRecord & {
  donorName: string;
  memberId: string;
  amount: number;
  mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  purpose: string;
  reference: string;
  date: string;
  status: 'Verified' | 'Pending' | 'Rejected';
};

export type Expense = BaseRecord & {
  category: string;
  note: string;
  amount: number;
  date: string;
  status: string;
  approvedBy: string;
};

export type ExecutiveRequest = BaseRecord & {
  memberName: string;
  memberId: string;
  contact: string;
  donationReference: string;
  reason: string;
  paymentProof: string | null;
  status: 'Pending review' | 'Approved' | 'Rejected';
  submittedOn: string;
  rejectionReason?: string;
};

export type ExecutivePermission = BaseRecord & {
  memberId: string;
  events: boolean;
  notices: boolean;
  donations: boolean;
  expenses: boolean;
  reports: boolean;
  media: boolean;
  eventsNeedApproval: boolean;
};

export type MediaItem = BaseRecord & {
  title: string;
  album: string;
  type: 'image' | 'video';
  url: string | null;
  uploadedBy: string;
  uploadedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
};

export type Report = BaseRecord & {
  title: string;
  period: string;
  generatedOn: string;
  format: 'PDF' | 'Excel';
};

export type AuditLog = BaseRecord & {
  actor: string;
  action: string;
  target: string;
  at: string;
};

export type AppSettings = BaseRecord & {
  societyName: string;
  contactEmail: string;
  phone: string;
  address: string;
  MIN_EXECUTIVE_DONATION: number;
  allowRegistration: boolean;
  requireMemberApproval: boolean;
  enableEventNotifications: boolean;
  allowUploads: boolean;
};

export type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  executives: number;
  upcomingEvents: number;
  totalDonations: number;
  totalExpenses: number;
  balance: number;
  pendingDonations: number;
  pendingRequests: number;
  pendingMedia: number;
  donationTrend: { month: string; amount: number }[];
};
