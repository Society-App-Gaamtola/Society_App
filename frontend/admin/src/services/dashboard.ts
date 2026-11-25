import type { DashboardStats, DateRange, MonthTotals, RecentActivity } from '@/types';
import { fromUtc, monthName } from '@/lib/utils';
import { api } from './core/backend';

/** GET /admin/dashboard (see the backend's adminModule.getDashboard) */
type BackendDashboard = {
  counts: { total_members: number; executives: number; active_events: number; total_notices: number };
  money: { total_donations: number; total_expenses: number; balance: number; donation_trend: number | null; expense_trend: number | null };
  pending: { donations: number; expenses: number; executive_requests: number; media: number; total: number };
  monthly: { month: string; donations: number; expenses: number }[];
  recent_activities: BackendActivity[];
};

/** One line of Recent Activities (built from the newest events, notices, members, uploads, requests, donations and
 * expenses: there is no activity log). text is already in the admin's language */
type BackendActivity = {
  id: string;
  action: string;
  text: string;
  /** What it was about: a title, a member, an amount */
  target: string | null;
  /** Who did it (null for a member added by the Super Admin) */
  actor_name: string | null;
  record_id: number;
  created_at: string;
};

const toActivity = (a: BackendActivity): RecentActivity => ({
  id: a.id,
  action: a.action,
  text: a.text,
  target: a.target,
  actor: a.actor_name,
  at: fromUtc(a.created_at) ?? a.created_at,
});

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
      activities: data.recent_activities.map(toActivity),
    };
  },
};
