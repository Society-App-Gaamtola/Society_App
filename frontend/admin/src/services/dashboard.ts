import type { DashboardStats } from '@/types';
import { donationsService } from './donations';
import { eventsService } from './events';
import { executiveRequestsService } from './executives';
import { expensesService } from './expenses';
import { mediaService } from './media';
import { membersService } from './members';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const [members, events, donations, expenses, requests, media] = await Promise.all([
      membersService.list(),
      eventsService.list(),
      donationsService.list(),
      expensesService.list(),
      executiveRequestsService.list({ filters: { status: 'Pending review' } }),
      mediaService.list({ filters: { status: 'Pending' } }),
    ]);

    const verified = donations.data.filter((d) => d.status === 'Verified');
    const totalDonations = verified.reduce((sum, d) => sum + d.amount, 0);
    const totalExpenses = expenses.data.reduce((sum, e) => sum + e.amount, 0);

    const byMonth = new Map<string, number>();
    for (const d of verified) {
      const key = d.date.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + d.amount);
    }

    return {
      totalMembers: members.total,
      activeMembers: members.data.filter((m) => m.status === 'Active').length,
      executives: members.data.filter((m) => m.type === 'Executive').length,
      upcomingEvents: events.data.filter((e) => e.status === 'Upcoming').length,
      totalDonations,
      totalExpenses,
      balance: totalDonations - totalExpenses,
      pendingDonations: donations.data.filter((d) => d.status === 'Pending').length,
      pendingRequests: requests.total,
      pendingMedia: media.total,
      donationTrend: [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, amount]) => ({ month: MONTHS[Number(key.slice(5)) - 1], amount })),
    };
  },
};
