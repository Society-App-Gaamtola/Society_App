import { fromUtc } from '@/lib/utils';
import type { ExportTable } from '@/lib/exporters';
import { formatDate, formatNumber, monthLabelLong, periodLabel, recordNo } from '@/lib/utils';
import { api, fetchAllPages, type Pagination } from './core/backend';

/**
 * Donations, expenses, financial reports and app settings, from the backend (/api/v1/admin/…).
 * Every list is paged; exports read the list page by page (fetchAllPages) and build the file in the browser.
 */

// ---------- Labels (backend codes → what the panel shows) ----------

export type PaymentMode = 'upi' | 'cash' | 'bank' | 'cheque';
export const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];
const METHOD_LABEL: Record<string, string> = { upi_app: 'UPI', upi_qr: 'UPI (QR)', upi: 'UPI', cash: 'Cash', bank: 'Bank Transfer', cheque: 'Cheque', gateway: 'Online' };
export const methodLabel = (method: string) => METHOD_LABEL[method] ?? method;

/** Donations: success = Verified; failed / cancelled (online payments) show as Rejected */
export const donationStatusLabel = (status: string) => (status === 'success' ? 'Verified' : status === 'pending' ? 'Pending' : 'Rejected');
export const expenseStatusLabel = (status: string) => (status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Rejected');
export const DONATION_STATUS_OPTIONS = [
  { value: 'success', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];
export const EXPENSE_STATUS_OPTIONS = [
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

/** Cards above the Donations / Expenses lists, for the same filters */
export type MoneySummary = { count: number; verified_total: number; highest: number; average: number };

// ---------- Donations ----------

export type Donation = {
  id: number;
  donor_user_id: number | null;
  donor_name: string;
  member_code: string | null;
  amount: number;
  purpose: string | null;
  method: string;
  status: string;
  reference_no: string | null;
  donated_on: string;
  proof_url: string | null;
  note: string | null;
  created_at: string;
  confirmed_at: string | null;
  entered_by_name: string | null;
  verified_by_name: string | null;
};

export type DonationQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  mode?: PaymentMode;
  purpose?: string;
  /** One member's donations (Member detail → Payment History) */
  donor_user_id?: number;
  from_date?: string;
  to_date?: string;
  sort?: 'date' | 'amount';
  order?: 'asc' | 'desc';
};

export type DonationBody = {
  donor_user_id: number | null;
  donor_name?: string;
  amount: number;
  purpose: string;
  method: string;
  reference_no: string;
  donated_on: string;
  status: string;
  proof_url: string | null;
  note: string;
};

const localDonation = (d: Donation): Donation => ({ ...d, created_at: fromUtc(d.created_at) ?? d.created_at, confirmed_at: fromUtc(d.confirmed_at) });

export const donationsApi = {
  list: async (query: DonationQuery) => {
    const { data } = await api<{ donations: Donation[]; summary: MoneySummary; pagination: Pagination }>('GET', '/admin/donations', { query });
    return { ...data, donations: data.donations.map(localDonation) };
  },
  save: (id: number | undefined, body: DonationBody) =>
    api<{ donation: Donation }>(id ? 'PUT' : 'POST', id ? `/admin/donations/${id}` : '/admin/donations', { body }),
  setStatus: (id: number, status: string) => api<{ donation: Donation }>('PUT', `/admin/donations/${id}/status`, { body: { status } }),
  remove: (id: number) => api<undefined>('DELETE', `/admin/donations/${id}`),
  listAll: (query: Omit<DonationQuery, 'page' | 'limit'>) =>
    fetchAllPages(async (page, limit) => {
      const { donations, pagination } = await donationsApi.list({ ...query, page, limit });
      return { rows: donations, pagination };
    }),
};

// ---------- Expenses ----------

export type Expense = {
  id: number;
  description: string;
  paid_to: string | null;
  category: string | null;
  amount: number;
  mode: string;
  reference_no: string | null;
  txn_date: string;
  status: string;
  bill_url: string | null;
  created_at: string;
  entered_by_name: string | null;
  verified_by_name: string | null;
};

export type ExpenseQuery = Omit<DonationQuery, 'purpose'> & { category?: string };

export type ExpenseBody = {
  description: string;
  paid_to: string;
  category: string;
  amount: number;
  mode: PaymentMode;
  reference_no: string;
  txn_date: string;
  status: string;
  bill_url: string | null;
};

export const expensesApi = {
  list: async (query: ExpenseQuery) => {
    const { data } = await api<{ expenses: Expense[]; summary: MoneySummary; pagination: Pagination }>('GET', '/admin/expenses', { query });
    return { ...data, expenses: data.expenses.map((e) => ({ ...e, created_at: fromUtc(e.created_at) ?? e.created_at })) };
  },
  save: (id: number | undefined, body: ExpenseBody) =>
    api<{ expense: Expense }>(id ? 'PUT' : 'POST', id ? `/admin/expenses/${id}` : '/admin/expenses', { body }),
  setStatus: (id: number, status: string) => api<{ expense: Expense }>('PUT', `/admin/expenses/${id}/status`, { body: { status } }),
  remove: (id: number) => api<undefined>('DELETE', `/admin/expenses/${id}`),
  listAll: (query: Omit<ExpenseQuery, 'page' | 'limit'>) =>
    fetchAllPages(async (page, limit) => {
      const { expenses, pagination } = await expensesApi.list({ ...query, page, limit });
      return { rows: expenses, pagination };
    }),
};

// ---------- Financial overview + reports ----------

export type Transaction = { kind: 'donation' | 'expense'; id: number; date: string; description: string; category: string | null; mode: string; amount: number; status: string };

export type FinanceOverview = {
  totals: { donations: number; expenses: number; balance: number; transactions: number; donation_trend: number | null; expense_trend: number | null };
  monthly: { month: string; donations: number; expenses: number }[];
  recent: Transaction[];
};

export type ReportType = 'summary' | 'donation' | 'expense' | 'category' | 'monthly' | 'custom';
export const REPORT_TYPES: { type: ReportType; label: string; hint: string }[] = [
  { type: 'summary', label: 'Summary Report', hint: 'Overview of income, expenses and balance' },
  { type: 'donation', label: 'Donation Report', hint: 'All donation entries' },
  { type: 'expense', label: 'Expense Report', hint: 'All expense entries' },
  { type: 'category', label: 'Category Wise Report', hint: 'Breakdown by category' },
  { type: 'monthly', label: 'Monthly Report', hint: 'Month wise summary' },
  { type: 'custom', label: 'Custom Report', hint: 'All transactions, filtered' },
];
export const reportLabel = (type: ReportType) => REPORT_TYPES.find((t) => t.type === type)?.label ?? 'Report';

export type ReportFilters = { from_date?: string; to_date?: string; category?: string; mode?: PaymentMode };
export type SavedReport = {
  id: number;
  report_type: ReportType;
  from_date: string | null;
  to_date: string | null;
  category: string | null;
  mode: PaymentMode | null;
  created_at: string;
  generated_by_name: string | null;
};

const SUMMARY_LABEL: Record<string, string> = {
  total_donations: 'Total donations (verified)',
  total_expenses: 'Total expenses (verified)',
  balance: 'Balance',
  verified_transactions: 'Verified transactions',
  pending_donations: 'Pending donations',
  pending_expenses: 'Pending expenses',
};

/** Every row of one report, read page by page */
const reportRows = (type: ReportType, filters: ReportFilters) =>
  fetchAllPages(async (page, limit) => {
    const { data } = await api<{ rows: Record<string, unknown>[]; pagination: Pagination }>('GET', `/admin/reports/data/${type}`, {
      query: { ...filters, page, limit },
    });
    return data;
  });

const money = (n: unknown) => formatNumber(Number(n));

/** The file's table for one report: the backend's rows + the panel's column names */
export async function buildReportTable(type: ReportType, filters: ReportFilters): Promise<ExportTable> {
  const rows = await reportRows(type, filters);
  const modeText = filters.mode ? PAYMENT_MODE_OPTIONS.find((m) => m.value === filters.mode)?.label : '';
  const subtitle = [periodLabel(filters.from_date, filters.to_date), filters.category && `Category: ${filters.category}`, modeText && `Mode: ${modeText}`]
    .filter(Boolean)
    .join(' · ');
  const base = { title: reportLabel(type), subtitle };
  switch (type) {
    case 'summary':
      return { ...base, columns: ['Item', 'Value'], rows: rows.map((r) => [SUMMARY_LABEL[String(r.item)] ?? String(r.item), String(r.item).startsWith('pending') || r.item === 'verified_transactions' ? Number(r.value) : money(r.value)]) };
    case 'donation':
      return {
        ...base,
        columns: ['Receipt No', 'Date', 'Donor', 'Member Code', 'Purpose', 'Mode', 'Reference', 'Status', 'Amount'],
        rows: (rows as unknown as Donation[]).map((d) => [recordNo('DON', d.id), formatDate(d.donated_on), d.donor_name, d.member_code ?? '', d.purpose ?? '', methodLabel(d.method), d.reference_no ?? '', donationStatusLabel(d.status), money(d.amount)]),
      };
    case 'expense':
      return {
        ...base,
        columns: ['Expense No', 'Date', 'Description', 'Paid To', 'Category', 'Mode', 'Status', 'Amount'],
        rows: (rows as unknown as Expense[]).map((e) => [recordNo('EXP', e.id), formatDate(e.txn_date), e.description, e.paid_to ?? '', e.category ?? '', methodLabel(e.mode), expenseStatusLabel(e.status), money(e.amount)]),
      };
    case 'category':
      return { ...base, columns: ['Type', 'Category', 'Entries', 'Amount'], rows: rows.map((r) => [r.kind === 'donation' ? 'Donation' : 'Expense', String(r.category || '—'), Number(r.entries), money(r.amount)]) };
    case 'monthly':
      return { ...base, columns: ['Month', 'Donations', 'Expenses', 'Balance'], rows: rows.map((r) => [monthLabelLong(String(r.month)), money(r.donations), money(r.expenses), money(r.balance)]) };
    case 'custom':
      return {
        ...base,
        columns: ['Date', 'Type', 'Description', 'Category', 'Mode', 'Status', 'Amount'],
        rows: (rows as unknown as Transaction[]).map((t) => [formatDate(t.date), t.kind === 'donation' ? 'Donation' : 'Expense', t.description ?? '', t.category ?? '', methodLabel(t.mode), t.kind === 'donation' ? donationStatusLabel(t.status) : expenseStatusLabel(t.status), money(t.amount)]),
      };
  }
}

export const reportFileName = (type: ReportType, f: ReportFilters) =>
  `${reportLabel(type).replace(/\s+/g, '-')}-${f.from_date || f.to_date ? `${f.from_date ?? 'start'}-${f.to_date ?? 'today'}` : 'all-time'}`;

export const financeApi = {
  overview: async (range: { from?: string; to?: string }) =>
    (await api<FinanceOverview>('GET', '/admin/finance', { query: { from_date: range.from, to_date: range.to } })).data,
  reports: async (query: { page: number; limit: number }) => {
    const { data } = await api<{ reports: SavedReport[]; pagination: Pagination }>('GET', '/admin/reports', { query });
    return { ...data, reports: data.reports.map((r) => ({ ...r, created_at: fromUtc(r.created_at) ?? r.created_at })) };
  },
  saveReport: (type: ReportType, filters: ReportFilters) => api<{ report: { id: number } }>('POST', '/admin/reports', { body: { report_type: type, ...filters } }),
  removeReport: (id: number) => api<undefined>('DELETE', `/admin/reports/${id}`),
};

// ---------- App settings ----------

export type AppSettings = {
  society_name: string;
  /** The name in Gujarati script (shown above the English one) */
  society_name_gu: string;
  contact_email: string;
  phone: string;
  address: string;
  logo_url: string | null;
  show_gujarati_name: boolean;
  executive_min_donation: number;
  allow_registration: boolean;
  allow_uploads: boolean;
  require_media_approval: boolean;
  event_notifications: boolean;
  notify_new_member: boolean;
  notify_donation: boolean;
  notify_executive_request: boolean;
  notify_media_upload: boolean;
  notify_expense: boolean;
  donation_purposes: string[];
  expense_categories: string[];
  /** Notice categories, lowercase (important / general / event + the society's own) */
  notice_tags: string[];
  /** Page links opened from the app; "" = not shown */
  social_links: SocialLinks;
  /** When the last database backup was downloaded (set by the backend, not saved from here) */
  last_backup_at: string | null;
};
export const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/your-page' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/your-page' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/your-page' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@your-channel' },
] as const;
export type SocialLinks = Record<(typeof SOCIAL_NETWORKS)[number]['key'], string>;
export type UpiDetails = { payee_name: string; upi_id: string; qr_image_url: string | null; display_note: string | null };
export type SettingsData = {
  settings: AppSettings;
  event_categories: { id: number; code: string; name: string; color: string }[];
  upi: UpiDetails | null;
};
export type SettingsChanges = Partial<AppSettings> & { event_categories?: { id?: number; name: string }[]; upi?: UpiDetails | null };

export const settingsApi = {
  get: async () => (await api<SettingsData>('GET', '/admin/settings')).data,
  save: (changes: SettingsChanges) => api<SettingsData>('PUT', '/admin/settings', { body: changes }),
  /** Every table as SQL (GET /admin/backup), saved as a .sql file in the browser */
  backup: async () => {
    const { data } = await api<{ file_name: string; tables: number; sql: string }>('GET', '/admin/backup');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data.sql], { type: 'application/sql' }));
    link.download = data.file_name;
    link.click();
    URL.revokeObjectURL(link.href);
    return { message: `Backup downloaded (${data.tables} tables)` };
  },
};
