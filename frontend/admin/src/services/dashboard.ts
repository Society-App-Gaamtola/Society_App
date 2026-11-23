import type { AuditLog, DashboardStats, DateRange, MonthTotals } from '@/types';
import { fromUtc, monthName } from '@/lib/utils';
import { api, type Pagination } from './core/backend';

/** GET /admin/dashboard (see the backend's adminModule.getDashboard) */
type BackendDashboard = {
  counts: { total_members: number; executives: number; active_events: number; total_notices: number };
  money: { total_donations: number; total_expenses: number; balance: number; donation_trend: number | null; expense_trend: number | null };
  pending: { donations: number; expenses: number; executive_requests: number; media: number; total: number };
  monthly: { month: string; donations: number; expenses: number }[];
  recent_activities: BackendActivity[];
};

/** One line of the activity log (audit_logs): text is already in the admin's language */
export type BackendActivity = {
  id: number;
  action: string;
  text: string;
  target: string | null;
  actor_name: string | null;
  actor_role: 'super_admin' | 'executive' | 'member' | null;
  table_name: string;
  record_id: number | null;
  ip_address: string | null;
  /** Logins: the platform and device model ("android · Pixel 7", "web") */
  device: string | null;
  created_at: string;
};

/** GET /admin/activities filters: the Audit Logs screen */
export type AuditLogQuery = {
  page: number;
  limit: number;
  type: 'changes' | 'logins';
  area?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
};

/** The areas the backend can filter by (constant.ACTIVITY_AREAS) */
export const AUDIT_AREAS = [
  { value: 'events', label: 'Events & Plans' },
  { value: 'notices', label: 'Notices' },
  { value: 'members', label: 'Members & Executives' },
  { value: 'donations', label: 'Donations' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'reports', label: 'Reports' },
  { value: 'media', label: 'Media' },
  { value: 'settings', label: 'Settings' },
];

/** The activity in the shape the dashboard's list shows ("Created event · Diwali Mela · by Kartik") */
const toAuditLog = (a: BackendActivity): AuditLog => {
  const at = fromUtc(a.created_at) ?? a.created_at;
  return { id: a.id, action: a.text, target: a.target ?? '—', actor: a.actor_name ?? 'System', at, created_at: at, updated_at: at };
};

/**
 * Chart labels. A month "2026-11" → "Nov" ("Nov '26" when the chart spans several years). A short period comes
 * back per day ("2026-11-05" → "5")
 */
export function toMonths(rows: BackendDashboard['monthly']): MonthTotals[] {
  const severalYears = rows.length > 0 && rows[0].month.slice(0, 4) !== rows[rows.length - 1].month.slice(0, 4);
  const label = (key: string) =>
    key.length === 10 ? String(Number(key.slice(8, 10))) : `${monthName(Number(key.slice(5, 7)) - 1)}${severalYears ? ` '${key.slice(2, 4)}` : ''}`;
  return rows.map((m) => ({
    key: m.month,
    month: label(m.month),
    donations: m.donations,
    expenses: m.expenses,
  }));
}

export const dashboardService = {
  /** Cards, chart, pending counts and the latest activities, for the picked period (none = all time) */
  async getDashboardStats(range: DateRange): Promise<DashboardStats> {
    const { data } = await api<BackendDashboard>('GET', '/admin/dashboard', { query: { from_date: range.from, to_date: range.to } });
    return {
      totalMembers: data.counts.total_members,
      executives: data.counts.executives,
      activeEvents: data.counts.active_events,
      totalNotices: data.counts.total_notices,
      totalDonations: data.money.total_donations,
      totalExpenses: data.money.total_expenses,
      balance: data.money.balance,
      donationTrend: data.money.donation_trend,
      expenseTrend: data.money.expense_trend,
      transactions: 0, // not on the dashboard
      recent: [],
      monthly: toMonths(data.monthly),
      pendingApprovals: data.pending.total,
      pendingDonations: data.pending.donations,
      pendingExpenses: data.pending.expenses, // cash-book entries waiting for verification
      pendingRequests: data.pending.executive_requests,
      pendingMedia: data.pending.media,
      activities: data.recent_activities.map(toAuditLog),
    };
  },

  /** The whole activity log, one page at a time ("View All") */
  async listActivities(page: number, pageSize: number) {
    const { data } = await api<{ activities: BackendActivity[]; pagination: Pagination }>('GET', '/admin/activities', { query: { page, limit: pageSize } });
    return { data: data.activities.map(toAuditLog), total: data.pagination.total };
  },

  /** The Audit Logs screen: changes or logins with filters, times in local time */
  async auditLogs(query: AuditLogQuery) {
    const { data } = await api<{ activities: BackendActivity[]; pagination: Pagination }>('GET', '/admin/activities', { query });
    return { ...data, activities: data.activities.map((a) => ({ ...a, created_at: fromUtc(a.created_at) ?? a.created_at })) };
  },
};
