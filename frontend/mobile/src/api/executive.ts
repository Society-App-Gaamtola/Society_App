// The executive screens: events and notices they create, Event Planning, donation entries and the financial reports.
// Every call is allowed by the user's role and sections in the backend route (executive permissions); the app only
// shows the screens the user's permissions allow (AuthUser.permissions).
import { request } from './client';
import type { ApiEvent, Pagination } from './user';
import type { Donation, DonationStatus, PaymentMode } from '../types';

/** "?page=2&search=x", leaving out empty values. */
const toQuery = (params: Record<string, string | number | boolean | undefined | null>) =>
  '?' +
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

// ---------- Events (POST / PUT /user/events, GET /user/events?mine=true) ----------

export type ApiEventStatus = 'draft' | 'scheduled' | 'posted' | 'cancelled';

/** An event in the creator's view: the public fields plus its workflow status */
export type ApiExecEvent = ApiEvent & {
  status: ApiEventStatus;
  publish_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventBody = {
  category_id: number;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string | null;
  start_time: string;
  venue_name: string;
  organizer_name?: string;
  contact_number?: string;
  poster_url?: string | null;
  images?: string[];
  action: 'draft' | 'post' | 'schedule';
  /** Publish and Share: also email the event to every member when it goes live */
  email_members?: boolean;
  /** ISO date-time, for action schedule */
  publish_at?: string;
  /** Create only: the Event Planning plan this event is made from */
  plan_id?: number;
};

export const createEvent = (body: EventBody) => request<{ event: ApiExecEvent }>('POST', '/user/events', { body });
export const updateEvent = (id: number, body: EventBody) => request<{ event: ApiExecEvent }>('PUT', `/user/events/${id}`, { body });
export const deleteEvent = (id: number) => request('DELETE', `/user/events/${id}`);
/** The user's own events, any status (newest first by the backend's order) */
export const getMyEvents = (page: number, filters: { status?: ApiEventStatus; search?: string } = {}) =>
  request<{ events: ApiExecEvent[]; pagination: Pagination }>('GET', `/user/events${toQuery({ page, mine: true, ...filters })}`);

// ---------- Notices ----------

export type NoticeBody = {
  title: string;
  body: string;
  /** One of App Settings' notice categories (lowercase) */
  tag: string;
  event_id?: number | null;
  action: 'draft' | 'publish';
  /** Publish and Share: also email the notice to the members when it goes live */
  email_members?: boolean;
};
export type ApiNoticeStatus = 'draft' | 'published';
/** A notice in its creator's view: the board fields plus its status */
export type ApiExecNotice = {
  id: number;
  title: string;
  body: string;
  tag: NoticeBody['tag'];
  event_id: number | null;
  status: ApiNoticeStatus;
  published_at: string | null;
  email_members?: 0 | 1;
  created_at: string;
  updated_at: string;
};

export const createNotice = (body: NoticeBody) => request<{ notice: { id: number } }>('POST', '/user/notices', { body });
export const updateNotice = (id: number, body: NoticeBody) => request<{ notice: ApiExecNotice }>('PUT', `/user/notices/${id}`, { body });
export const deleteNotice = (id: number) => request('DELETE', `/user/notices/${id}`);
export const setNoticeStatus = (id: number, status: ApiNoticeStatus) =>
  request<{ notice: ApiExecNotice }>('PUT', `/user/notices/${id}/status`, { body: { status } });
/** The user's own notices, any status, newest first */
export const getMyNotices = (page: number, filters: { status?: ApiNoticeStatus } = {}) =>
  request<{ notices: ApiExecNotice[]; pagination: Pagination }>('GET', `/user/notices${toQuery({ page, mine: true, ...filters })}`);
export const getMyNotice = (id: number) => request<{ notice: ApiExecNotice }>('GET', `/user/notices/${id}`);

// ---------- Event Planning (GET / POST / PUT / DELETE /user/event-plans) ----------

export type PlanStatus = 'idea' | 'planning' | 'approved' | 'dropped' | 'converted';
export type ApiEventPlan = {
  id: number;
  title: string;
  notes: string | null;
  /** yyyy-mm-dd */
  tentative_date: string | null;
  status: PlanStatus;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  /** 1 when this user may edit / delete it (their own, or they are the Super Admin) */
  can_edit: 0 | 1;
};
export type PlanBody = { title: string; notes?: string; tentative_date?: string | null; status: PlanStatus };

export const getEventPlans = (page: number, filters: { status?: PlanStatus; search?: string } = {}) =>
  request<{ plans: ApiEventPlan[]; pagination: Pagination }>('GET', `/user/event-plans${toQuery({ page, ...filters })}`);
export const saveEventPlan = (body: PlanBody, id?: number) =>
  id ? request('PUT', `/user/event-plans/${id}`, { body }) : request('POST', '/user/event-plans', { body });
export const deleteEventPlan = (id: number) => request('DELETE', `/user/event-plans/${id}`);

// ---------- Donation entries (/admin/donations: the Donations section) ----------

export type ApiEntryMethod = 'upi_app' | 'upi_qr' | 'cash' | 'bank' | 'cheque';
export type ApiEntryStatus = 'success' | 'pending' | 'rejected';
export type ApiDonationEntry = {
  id: number;
  donor_user_id: number | null;
  donor_name: string;
  member_code: string | null;
  amount: number;
  purpose: string | null;
  method: ApiEntryMethod;
  status: ApiEntryStatus;
  reference_no: string | null;
  /** yyyy-mm-dd */
  donated_on: string;
  proof_url: string | null;
  note: string | null;
  created_at: string;
  entered_by_name: string | null;
  verified_by_name: string | null;
};
export type EntryFilters = {
  search?: string;
  status?: ApiEntryStatus;
  /** upi | cash | bank | cheque (UPI covers upi_app and upi_qr) */
  mode?: 'upi' | 'cash' | 'bank' | 'cheque';
  from_date?: string;
  to_date?: string;
};
export type EntryBody = {
  /** The member's code (GM0012) when the donor is a member; otherwise donor_name */
  member_code?: string;
  donor_name?: string;
  amount: number;
  purpose: string;
  method: ApiEntryMethod;
  reference_no?: string;
  donated_on: string;
  status: ApiEntryStatus;
  proof_url?: string | null;
  note?: string;
};
export type EntrySummary = { count: number; verified_total: number; highest: number; average: number };

export const getDonationEntries = (page: number, filters: EntryFilters = {}) =>
  request<{ donations: ApiDonationEntry[]; summary: EntrySummary; pagination: Pagination }>(
    'GET',
    `/admin/donations${toQuery({ page, ...filters })}`,
  );
export const getDonationEntry = (id: number) => request<{ donation: ApiDonationEntry }>('GET', `/admin/donations/${id}`);
export const saveDonationEntry = (body: EntryBody, id?: number) =>
  id
    ? request<{ donation: ApiDonationEntry }>('PUT', `/admin/donations/${id}`, { body })
    : request<{ donation: ApiDonationEntry }>('POST', '/admin/donations', { body });
export const setDonationEntryStatus = (id: number, status: ApiEntryStatus) =>
  request<{ donation: ApiDonationEntry }>('PUT', `/admin/donations/${id}/status`, { body: { status } });
export const deleteDonationEntry = (id: number) => request('DELETE', `/admin/donations/${id}`);

const MODE_OF: Record<ApiEntryMethod, PaymentMode> = { upi_app: 'UPI', upi_qr: 'UPI', cash: 'Cash', bank: 'Bank Transfer', cheque: 'Cheque' };
/** The app's payment mode → the API method (a UPI entry made here is a UPI app payment) */
export const METHOD_OF: Record<PaymentMode, ApiEntryMethod> = { UPI: 'upi_app', Cash: 'cash', 'Bank Transfer': 'bank', Cheque: 'cheque' };
/** The app's mode filter → the API's mode (UPI covers app and QR payments) */
export const MODE_FILTER: Record<PaymentMode, NonNullable<EntryFilters['mode']>> = { UPI: 'upi', Cash: 'cash', 'Bank Transfer': 'bank', Cheque: 'cheque' };
const STATUS_OF: Record<ApiEntryStatus, DonationStatus> = { success: 'Verified', pending: 'Pending', rejected: 'Rejected' };

/** An API donation entry, ready for the app's cards and reports */
export const toDonation = (d: ApiDonationEntry): Donation => ({
  id: String(d.id),
  donorName: d.donor_name,
  memberId: d.member_code ?? '-',
  date: d.donated_on,
  mode: MODE_OF[d.method] ?? 'Cash',
  amount: Number(d.amount),
  status: STATUS_OF[d.status] ?? 'Pending',
  reference: d.reference_no ?? undefined,
  purpose: d.purpose ?? undefined,
  note: d.note ?? undefined,
  proofUrl: d.proof_url,
});

// ---------- Society Expenses (GET /admin/expenses: the Expenses section) ----------

export type ApiExpenseStatus = 'verified' | 'pending' | 'rejected';
export type ApiExpense = {
  id: number;
  description: string;
  paid_to: string;
  category: string;
  amount: number;
  mode: 'cash' | 'upi' | 'bank' | 'cheque';
  reference_no: string | null;
  /** yyyy-mm-dd */
  txn_date: string;
  status: ApiExpenseStatus;
  bill_url: string | null;
};
export type ExpenseSummary = {
  count: number;
  /** Verified expenses in the period */
  verified_total: number;
  /** Verified donations in the period */
  income: number;
  /** All verified donations − all verified expenses (today's cash in hand) */
  balance: number;
  /** Verified expenses per category, largest first */
  categories: { category: string; amount: number }[];
};

/** Expenses in the dates (any status, newest first) with the period's summary and the society's categories */
export const getExpenses = (page: number, range: { from_date: string; to_date: string }) =>
  request<{ expenses: ApiExpense[]; summary: ExpenseSummary; pagination: Pagination; expense_categories: string[] }>(
    'GET',
    `/admin/expenses${toQuery({ page, ...range })}`,
  );

export type ExpenseBody = {
  description: string;
  paid_to: string;
  category: string;
  amount: number;
  mode: ApiExpense['mode'];
  reference_no?: string;
  /** yyyy-mm-dd, not in the future */
  txn_date: string;
  status: ApiExpenseStatus;
  bill_url?: string | null;
};
export const getExpense = (id: number) => request<{ expense: ApiExpense }>('GET', `/admin/expenses/${id}`);
export const saveExpense = (body: ExpenseBody, id?: number) =>
  id
    ? request<{ expense: ApiExpense }>('PUT', `/admin/expenses/${id}`, { body })
    : request<{ expense: ApiExpense }>('POST', '/admin/expenses', { body });
export const setExpenseStatus = (id: number, status: ApiExpenseStatus) =>
  request<{ expense: ApiExpense }>('PUT', `/admin/expenses/${id}/status`, { body: { status } });
export const deleteExpense = (id: number) => request('DELETE', `/admin/expenses/${id}`);

// ---------- Financial reports (/admin/finance and /admin/reports: the Reports section) ----------

export type ApiFinance = {
  totals: { donations: number; expenses: number; balance: number; transactions: number; donation_trend: number | null; expense_trend: number | null };
  /** One row per month, or per day ("YYYY-MM-DD") for a period of a month or less */
  monthly: { month: string; donations: number; expenses: number }[];
};
export const getFinance = (range: { from_date?: string; to_date?: string }) =>
  request<ApiFinance>('GET', `/admin/finance${toQuery(range)}`);

/** Expense rows for a report (any status), one page */
export const getReportExpenses = (page: number, range: { from_date: string; to_date: string }) =>
  request<{ rows: ApiExpense[]; pagination: Pagination }>('GET', `/admin/reports/data/expense${toQuery({ page, limit: 50, ...range })}`);

/** The Income & Expense Summary's totals, added up by the server (verified entries only) */
export type ApiReportTotal = { item: 'total_donations' | 'total_expenses' | 'balance' | 'verified_transactions' | 'pending_donations' | 'pending_expenses'; value: number };
export type ApiReportCategory = { kind: 'donation' | 'expense'; category: string; entries: number; amount: number };
export type ApiReportMonth = { month: string; donations: number; expenses: number; balance: number };
export const getReportTotals = (range: { from_date: string; to_date: string }) =>
  request<{ rows: ApiReportTotal[] }>('GET', `/admin/reports/data/summary${toQuery(range)}`);
export const getReportCategories = (range: { from_date: string; to_date: string }) =>
  request<{ rows: ApiReportCategory[] }>('GET', `/admin/reports/data/category${toQuery(range)}`);
export const getReportMonths = (range: { from_date: string; to_date: string }) =>
  request<{ rows: ApiReportMonth[] }>('GET', `/admin/reports/data/monthly${toQuery(range)}`);

/** Donation rows for a report (verified, pending and rejected), one page */
export const getReportDonations = (page: number, range: { from_date: string; to_date: string }) =>
  request<{ rows: ApiDonationEntry[]; pagination: Pagination }>('GET', `/admin/reports/data/donation${toQuery({ page, limit: 50, ...range })}`);

export type ApiSavedReport = {
  id: number;
  report_type: string;
  from_date: string | null;
  to_date: string | null;
  created_at: string;
  generated_by_name?: string | null;
};
export const getSavedReports = (page = 1) =>
  request<{ reports: ApiSavedReport[]; pagination: Pagination }>('GET', `/admin/reports${toQuery({ page })}`);
export const saveReportRecord = (body: { report_type: string; from_date: string; to_date: string }) =>
  request('POST', '/admin/reports', { body });
export const deleteReportRecord = (id: number) => request('DELETE', `/admin/reports/${id}`);
