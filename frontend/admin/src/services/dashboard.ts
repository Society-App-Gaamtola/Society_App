import type { AuditLog, DashboardStats, DateRange } from '@/types';
import { auditLogsService } from './auditLogs';
import { eventsService } from './events';
import { executiveRequestsService } from './executives';
import { loadFinanceRows, summarize } from './finance';
import { mediaService } from './media';
import { membersService } from './members';
import { noticesService } from './notices';

const ACTIVITY_COUNT = 5;

export const dashboardService = {
  async getDashboardStats(range: DateRange): Promise<DashboardStats> {
    const [members, events, notices, finance, requests, media, logs] = await Promise.all([
      membersService.list(),
      eventsService.list({ filters: { status: 'Published' } }),
      noticesService.list(),
      loadFinanceRows(),
      executiveRequestsService.list({ filters: { status: 'Pending review' } }),
      mediaService.list({ filters: { status: 'Pending' } }),
      auditLogsService.list({ page: 1, pageSize: ACTIVITY_COUNT, sort: { field: 'at', order: 'desc' } }),
    ]);

    const pendingDonations = finance.donations.filter((d) => d.status === 'Pending').length;
    const pendingExpenses = finance.expenses.filter((e) => e.status === 'Pending').length;

    return {
      ...summarize(finance.donations, finance.expenses, range),
      totalMembers: members.total,
      executives: members.data.filter((m) => m.type === 'Executive').length,
      activeEvents: events.total,
      totalNotices: notices.total,
      pendingDonations,
      pendingExpenses,
      pendingRequests: requests.total,
      pendingMedia: media.total,
      pendingApprovals: pendingDonations + pendingExpenses + requests.total + media.total,
      activities: logs.data,
    };
  },
  listActivities: (page: number, pageSize: number) =>
    auditLogsService.list({ page, pageSize, sort: { field: 'at', order: 'desc' } }) as Promise<{ data: AuditLog[]; total: number }>,
};
