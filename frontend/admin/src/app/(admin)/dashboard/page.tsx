'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Crown,
  FileText,
  HandCoins,
  ImageIcon,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, EmptyState, ErrorState, PageHeader, StatCard, StatCardsSkeleton, ViewDialog } from '@/components/common';
import { PeriodFilter, usePeriodLabel } from '@/components/PeriodFilter';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/ui/primitives';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useActivities, useDashboardStats } from '@/hooks/useDashboard';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDate, formatDateTime, formatINR } from '@/lib/utils';
import type { AuditLog } from '@/types';

const IncomeExpenseChart = dynamic(() => import('@/components/IncomeExpenseChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-72" />,
});

const ACTIVITY_PAGE_SIZE = DEFAULT_PAGE_SIZE;

/** Picks an icon from the wording of the audit entry. */
function activityIcon(action: string): LucideIcon {
  const a = action.toLowerCase();
  if (a.includes('member')) return UserPlus;
  if (a.includes('donation')) return HandCoins;
  if (a.includes('expense')) return ReceiptText;
  if (a.includes('event')) return CalendarDays;
  if (a.includes('notice')) return Megaphone;
  if (a.includes('photo')) return ImageIcon;
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

/** The dashboard's period as list filters (from / to), so a money card opens the same dates */
function withRange(path: string, params: Record<string, string>, range: { from?: string; to?: string }) {
  const query = new URLSearchParams(params);
  if (range.from) query.set('from', range.from);
  if (range.to) query.set('to', range.to);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

type PendingCounts = { donations: number; requests: number; media: number };

/** "Pending Approvals" card: what is waiting, each row opening its approval queue */
function PendingDialog({ open, onOpenChange, counts }: { open: boolean; onOpenChange: (open: boolean) => void; counts: PendingCounts }) {
  const rows: { label: string; count: number; href: string; icon: LucideIcon }[] = [
    { label: 'Donations to verify', count: counts.donations, href: '/donations?status=pending', icon: HandCoins },
    { label: 'Executive requests', count: counts.requests, href: '/executives?status=pending', icon: Crown },
    { label: 'Photos / videos to approve', count: counts.media, href: '/media?tab=pending', icon: ImageIcon },
  ];
  return (
    <ViewDialog open={open} onOpenChange={onOpenChange} title="Pending Approvals" className="max-w-md">
      <ul className="divide-y divide-border">
        {rows.map(({ label, count, href, icon: Icon }) => (
          <li key={href}>
            <Link href={href} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm hover:bg-muted">
              <Icon className="h-5 w-5 shrink-0 text-maroon" />
              <span className="flex-1 font-medium">{label}</span>
              <span className="rounded-full bg-[#FFF1E0] px-2.5 py-0.5 text-xs font-bold text-[#E0700B]">{count}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </ViewDialog>
  );
}

export default function DashboardPage() {
  const { range } = useUrlState();
  const { data, isLoading, isError, refetch } = useDashboardStats(range);
  const [showAll, setShowAll] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const periodLabel = usePeriodLabel();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Manage, support and grow our society" actions={<PeriodFilter />} />
      {isError ? <ErrorState onRetry={() => refetch()} /> : null}
      {isLoading ? <StatCardsSkeleton count={8} /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} value={data.totalMembers} label="Total Members" tone="red" href="/members?status=active&signup=completed" />
            <StatCard icon={Crown} value={data.executives} label="Executive Members" tone="amber" href="/executives?tab=permissions" />
            <StatCard icon={CalendarDays} value={data.activeEvents} label="Active Events" tone="blue" href="/events?status=posted" />
            <StatCard icon={FileText} value={data.totalNotices} label="Total Notices" tone="red" href="/notices?status=published" />
            <StatCard icon={HandCoins} value={formatINR(data.totalDonations)} label="Total Donations" trend={data.donationTrend} tone="green" href={withRange('/donations', { status: 'success' }, range)} />
            <StatCard icon={ReceiptText} value={formatINR(data.totalExpenses)} label="Total Expenses" trend={data.expenseTrend} trendGoodWhenUp={false} tone="red" href={withRange('/expenses', { status: 'verified' }, range)} />
            <StatCard icon={Wallet} value={formatINR(data.balance)} label="Current Balance" tone="blue" href={withRange('/reports', {}, range)} />
            <StatCard icon={Clock} value={data.pendingApprovals} label="Pending Approvals" tone="orange" onClick={() => setShowPending(true)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Card
              title="Donation vs Expense Overview"
              className="min-w-0 lg:col-span-3"
              action={<span className="rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-semibold text-maroon">{periodLabel}</span>}
            >
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
          <PendingDialog
            open={showPending}
            onOpenChange={setShowPending}
            counts={{ donations: data.pendingDonations, requests: data.pendingRequests, media: data.pendingMedia }}
          />
        </>
      ) : null}
    </>
  );
}
