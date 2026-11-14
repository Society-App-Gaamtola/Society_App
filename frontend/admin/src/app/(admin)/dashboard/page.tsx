'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Crown,
  FileText,
  HandCoins,
  ReceiptText,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, DateRangePicker, EmptyState, ErrorState, PageHeader, StatCard, StatCardsSkeleton, ViewDialog } from '@/components/common';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/ui/primitives';
import { useActivities, useDashboardStats } from '@/hooks/useDashboard';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDate, formatDateTime, formatINR } from '@/lib/utils';
import type { AuditLog } from '@/types';

const IncomeExpenseChart = dynamic(() => import('@/components/IncomeExpenseChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-72" />,
});

const ACTIVITY_PAGE_SIZE = 10;

/** Picks an icon from the wording of the audit entry. */
function activityIcon(action: string): LucideIcon {
  const a = action.toLowerCase();
  if (a.includes('member')) return UserPlus;
  if (a.includes('donation')) return HandCoins;
  if (a.includes('expense')) return ReceiptText;
  if (a.includes('event')) return CalendarDays;
  if (a.includes('executive') || a.includes('permission')) return ShieldCheck;
  return FileText;
}

function ActivityRow({ log }: { log: AuditLog }) {
  const Icon = activityIcon(log.action);
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FDECEC] text-maroon">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{log.action}</div>
        <div className="truncate text-xs text-muted-foreground">
          {log.target} · by {log.actor}
        </div>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(log.at)}</span>
    </li>
  );
}

function AllActivitiesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [page, setPage] = useState(1);
  const { data } = useActivities(page, ACTIVITY_PAGE_SIZE, open);
  return (
    <ViewDialog open={open} onOpenChange={onOpenChange} title="All Activities" className="max-w-xl">
      <ul className="divide-y divide-border">
        {data?.data.map((log) => (
          <li key={log.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="font-semibold">{log.action}</div>
              <div className="truncate text-xs text-muted-foreground">
                {log.target} · by {log.actor}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.at)}</span>
          </li>
        ))}
      </ul>
      <Pagination page={page} total={data?.total ?? 0} pageSize={ACTIVITY_PAGE_SIZE} onPageChange={setPage} itemLabel="activities" className="px-0" />
    </ViewDialog>
  );
}

export default function DashboardPage() {
  const { range } = useUrlState();
  const { data, isLoading, isError, refetch } = useDashboardStats(range);
  const [showAll, setShowAll] = useState(false);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Manage, support and grow our society" actions={<DateRangePicker />} />
      {isError ? <ErrorState onRetry={() => refetch()} /> : null}
      {isLoading ? <StatCardsSkeleton count={8} /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} value={data.totalMembers} label="Total Members" tone="red" />
            <StatCard icon={Crown} value={data.executives} label="Executive Members" tone="amber" />
            <StatCard icon={CalendarDays} value={data.activeEvents} label="Active Events" tone="blue" />
            <StatCard icon={FileText} value={data.totalNotices} label="Total Notices" tone="red" />
            <StatCard icon={HandCoins} value={formatINR(data.totalDonations)} label="Total Donations" trend={data.donationTrend} tone="green" />
            <StatCard icon={ReceiptText} value={formatINR(data.totalExpenses)} label="Total Expenses" trend={data.expenseTrend} trendGoodWhenUp={false} tone="red" />
            <StatCard icon={Wallet} value={formatINR(data.balance)} label="Current Balance" tone="blue" />
            <StatCard icon={Clock} value={data.pendingApprovals} label="Pending Approvals" tone="orange" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Card title="Donation vs Expense Overview" className="lg:col-span-3">
              <IncomeExpenseChart data={data.monthly} />
            </Card>
            <Card
              title="Recent Activities"
              className="lg:col-span-2"
              action={
                <button type="button" onClick={() => setShowAll(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-maroon hover:underline">
                  View All <ArrowRight className="h-4 w-4" />
                </button>
              }
            >
              {data.activities.length ? (
                <ul className="divide-y divide-border">
                  {data.activities.map((log) => (
                    <ActivityRow key={log.id} log={log} />
                  ))}
                </ul>
              ) : (
                <EmptyState message="No activity yet." />
              )}
            </Card>
          </div>
          <AllActivitiesDialog open={showAll} onOpenChange={setShowAll} />
        </>
      ) : null}
    </>
  );
}
